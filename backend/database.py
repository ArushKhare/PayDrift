import asyncio
import json
import os

import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core.exceptions import AlreadyExists

USERS_COLLECTION = "users"

_db = None


def _init_firebase():
    global _db
    if _db is not None:
        return

    try:
        app = firebase_admin.get_app()
    except ValueError:
        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_json:
            cred = credentials.Certificate(json.loads(cred_json))
        elif cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            raise RuntimeError(
                "Missing Firebase credentials: set FIREBASE_CREDENTIALS_JSON "
                "(service account JSON as a string) or FIREBASE_CREDENTIALS_PATH "
                "(path to the service account JSON file)."
            )
        app = firebase_admin.initialize_app(cred)

    _db = firestore.client(app)


async def init_db():
    """Initialize the Firebase app and Firestore client. Firestore is schemaless — no table to create."""
    await asyncio.to_thread(_init_firebase)


async def get_user_by_email(email: str) -> dict | None:
    """Return user dict or None."""
    def _get():
        doc = _db.collection(USERS_COLLECTION).document(email).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return {"email": email, "name": data["name"], "hashed_password": data["hashed_password"]}

    return await asyncio.to_thread(_get)


async def create_user(email: str, name: str, hashed_password: str):
    """Create a new user document, keyed by email. Raises AlreadyExists if the email is taken."""
    def _create():
        _db.collection(USERS_COLLECTION).document(email).create({
            "name": name,
            "hashed_password": hashed_password,
        })

    await asyncio.to_thread(_create)
