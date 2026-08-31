from supabase import create_client, Client

from app.core.config import settings


supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)


def get_storage():
    return supabase.storage.from_(
        settings.supabase_storage_bucket
    )


def create_signed_download_url(
    storage_path: str,
    expires_in: int = 3600
):
    storage = get_storage()

    response = storage.create_signed_url(
        storage_path,
        expires_in
    )

    if isinstance(response, dict):
        signed_url = response.get("signedURL")

        if not signed_url:
            signed_url = response.get("signed_url")

        return signed_url

    signed_url = getattr(
        response,
        "signedURL",
        None
    )

    if not signed_url:
        signed_url = getattr(
            response,
            "signed_url",
            None
        )

    return signed_url