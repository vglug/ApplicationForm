"""
Celery tasks for background job processing.
"""
import os
import sys
import logging
from datetime import datetime, timedelta
from celery.exceptions import MaxRetriesExceededError

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from celery_config import celery_app
from email_service import email_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_flask_app():
    """Get or create Flask app for database access"""
    from flask import Flask
    from config import Config
    from models import db

    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    return app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email_task(self, email_queue_id: int):
    """
    Send verification email as a background task.

    Args:
        email_queue_id: ID of the EmailQueue record to process
    """
    from models import db, EmailQueue, BasicInfo

    app = get_flask_app()
    with app.app_context():
        # Get the email queue record
        email_record = db.session.get(EmailQueue, email_queue_id)
        if not email_record:
            logger.error(f"EmailQueue record {email_queue_id} not found")
            return {'success': False, 'error': 'Record not found'}

        # Update status to processing
        email_record.status = 'processing'
        email_record.celery_task_id = self.request.id
        email_record.processed_at = datetime.utcnow()
        db.session.commit()

        try:
            # Send the email
            logger.info(f"Sending email to {email_record.to_email} for {email_record.candidate_id}")
            success, error = email_service.send_verification_email(
                to_email=email_record.to_email,
                candidate_name=email_record.recipient_name,
                candidate_id=email_record.candidate_id
            )

            if success:
                # Update email queue status
                email_record.status = 'sent'
                email_record.sent_at = datetime.utcnow()
                email_record.error_message = None

                # Update BasicInfo - mark as sent (NOT verified - SMTP acceptance != delivery)
                # Note: email_verified=True means SMTP server accepted the message
                # Bounces may still occur asynchronously and cannot be detected here
                basic_info = BasicInfo.query.filter_by(candidate_id=email_record.candidate_id).first()
                if basic_info:
                    basic_info.email_verified = True  # SMTP accepted - NOT delivery confirmation
                    basic_info.email_sent_at = datetime.utcnow()
                    basic_info.email_verified_at = datetime.utcnow()
                    basic_info.email_error = None

                db.session.commit()
                logger.info(f"Email accepted by SMTP server for {email_record.to_email} (delivery not guaranteed)")
                return {'success': True, 'candidate_id': email_record.candidate_id}

            else:
                # Email failed
                email_record.retry_count += 1
                email_record.error_message = error
                email_record.last_error_at = datetime.utcnow()

                if email_record.retry_count >= email_record.max_retries:
                    email_record.status = 'failed'
                    # Update BasicInfo
                    basic_info = BasicInfo.query.filter_by(candidate_id=email_record.candidate_id).first()
                    if basic_info:
                        basic_info.email_verified = False
                        basic_info.email_error = error
                    db.session.commit()
                    logger.error(f"Email permanently failed for {email_record.candidate_id}: {error}")
                    return {'success': False, 'error': error, 'retries_exhausted': True}
                else:
                    email_record.status = 'pending'
                    db.session.commit()
                    # Retry the task
                    logger.warning(f"Email failed for {email_record.candidate_id}, retrying: {error}")
                    raise self.retry(exc=Exception(error))

        except MaxRetriesExceededError:
            email_record.status = 'failed'
            db.session.commit()
            logger.error(f"Max retries exceeded for {email_record.candidate_id}")
            return {'success': False, 'error': 'Max retries exceeded'}

        except Exception as e:
            email_record.retry_count += 1
            email_record.error_message = str(e)
            email_record.last_error_at = datetime.utcnow()

            if email_record.retry_count >= email_record.max_retries:
                email_record.status = 'failed'
                basic_info = BasicInfo.query.filter_by(candidate_id=email_record.candidate_id).first()
                if basic_info:
                    basic_info.email_verified = False
                    basic_info.email_error = str(e)
                db.session.commit()
                logger.error(f"Email task failed for {email_record.candidate_id}: {str(e)}")
                return {'success': False, 'error': str(e)}
            else:
                email_record.status = 'pending'
                db.session.commit()
                logger.warning(f"Email task error for {email_record.candidate_id}, retrying: {str(e)}")
                raise self.retry(exc=e)


@celery_app.task
def retry_failed_emails():
    """
    Periodic task to retry failed emails that haven't exceeded max retries.
    Runs every 5 minutes via Celery Beat.
    """
    from models import db, EmailQueue

    app = get_flask_app()
    with app.app_context():
        # Find emails that failed but can still be retried
        pending_emails = EmailQueue.query.filter(
            EmailQueue.status == 'pending',
            EmailQueue.retry_count < EmailQueue.max_retries,
            EmailQueue.last_error_at < datetime.utcnow() - timedelta(minutes=5)
        ).limit(50).all()

        retried_count = 0
        for email_record in pending_emails:
            send_verification_email_task.delay(email_record.id)
            retried_count += 1

        if retried_count > 0:
            logger.info(f"Queued {retried_count} emails for retry")

        return {'retried': retried_count}


@celery_app.task
def cleanup_old_email_records():
    """
    Periodic task to clean up old email records (older than 30 days).
    Runs daily via Celery Beat.
    """
    from models import db, EmailQueue

    app = get_flask_app()
    with app.app_context():
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        # Delete old sent emails
        deleted = EmailQueue.query.filter(
            EmailQueue.status == 'sent',
            EmailQueue.sent_at < cutoff_date
        ).delete()

        db.session.commit()
        logger.info(f"Cleaned up {deleted} old email records")

        return {'deleted': deleted}


@celery_app.task
def send_bulk_emails_task(candidate_ids: list):
    """
    Send emails to multiple candidates.

    Args:
        candidate_ids: List of candidate IDs to send emails to
    """
    from models import db, EmailQueue, BasicInfo

    app = get_flask_app()
    with app.app_context():
        queued = 0
        for candidate_id in candidate_ids:
            basic_info = BasicInfo.query.filter_by(candidate_id=candidate_id).first()
            if basic_info and basic_info.email:
                # Check if already queued
                existing = EmailQueue.query.filter(
                    EmailQueue.candidate_id == candidate_id,
                    EmailQueue.status.in_(['pending', 'processing'])
                ).first()

                if not existing:
                    email_record = EmailQueue(
                        candidate_id=candidate_id,
                        to_email=basic_info.email,
                        recipient_name=basic_info.full_name,
                        email_type='verification',
                        status='pending'
                    )
                    db.session.add(email_record)
                    db.session.flush()

                    # Queue the email task
                    send_verification_email_task.delay(email_record.id)
                    queued += 1

        db.session.commit()
        logger.info(f"Queued {queued} bulk emails")

        return {'queued': queued}
