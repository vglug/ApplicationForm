"""
Celery configuration for background task processing.
"""
import os
import sys
from celery import Celery
from dotenv import load_dotenv

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

# Redis URL for Celery broker and backend
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')


def make_celery(app=None):
    """Create Celery app with Flask context"""
    celery = Celery(
        'vglug_tasks',
        broker=REDIS_URL,
        backend=REDIS_URL,
        include=['tasks']
    )

    # Celery configuration
    celery.conf.update(
        # Task settings
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,

        # Task execution settings
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,

        # Retry settings
        task_default_retry_delay=60,
        task_max_retries=3,

        # Result backend settings
        result_expires=86400,

        # Beat scheduler for periodic tasks
        beat_schedule={
            'retry-failed-emails': {
                'task': 'tasks.retry_failed_emails',
                'schedule': 300.0,
            },
            'cleanup-old-email-records': {
                'task': 'tasks.cleanup_old_email_records',
                'schedule': 86400.0,
            },
        },
    )

    if app:
        celery.conf.update(app.config)

        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)

        celery.Task = ContextTask

    return celery


# Create celery app without Flask context (for worker)
celery_app = make_celery()


def init_celery(app):
    """Initialize Celery with Flask app context"""
    global celery_app
    celery_app = make_celery(app)
    return celery_app
