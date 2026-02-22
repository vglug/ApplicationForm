# Backend (Flask)

Quick start (dev):

1. Create a Python virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET_KEY`.

3. Initialize the database and run the app:

```bash
export FLASK_APP=app:create_app
flask db init
flask db migrate -m "init"
flask db upgrade
flask run --host=0.0.0.0
```

Endpoints:
- `POST /auth/register` {email,password}
- `POST /auth/login` {email,password} -> returns `access_token`
- `GET /form` -> returns JSON form definition (reads `markdown/dynamic_form_json.json`)
- `POST /submit` -> accepts form data JSON; optional JWT auth
