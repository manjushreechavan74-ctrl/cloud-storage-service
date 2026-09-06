from supabase import create_client, Client

from app.core.config import settings


# =========================================================
# SUPABASE CLIENT
# =========================================================

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)


# =========================================================
# STORAGE
# =========================================================

def get_storage():
    return supabase.storage.from_(
        settings.supabase_storage_bucket
    )


# =========================================================
# CREATE SIGNED DOWNLOAD URL
# =========================================================

def create_signed_download_url(
    storage_path: str,
    expires_in: int = 3600
):
    if not storage_path:
        return None

    storage = get_storage()

    try:
        response = storage.create_signed_url(
            storage_path,
            expires_in
        )

        # Supabase response can be a dictionary
        if isinstance(response, dict):

            signed_url = response.get(
                "signedURL"
            )

            if not signed_url:
                signed_url = response.get(
                    "signed_url"
                )

            return signed_url

        # Object-style response
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

    except Exception as error:

        print(
            f"Signed download URL error: {error}"
        )

        return None


# =========================================================
# DELETE FILE FROM STORAGE
# =========================================================

def delete_storage_file(
    storage_path: str
):
    """
    Permanently deletes a file from
    the configured Supabase Storage bucket.
    """

    if not storage_path:
        return False

    storage = get_storage()

    try:

        response = storage.remove(
            [storage_path]
        )

        # -------------------------------------------------
        # Supabase normally returns a list of removed files
        # -------------------------------------------------

        if response is None:
            return False

        # If response is a list, an empty list means
        # nothing was removed.
        if isinstance(response, list):
            return len(response) > 0

        # Some versions may return an object/dictionary.
        if isinstance(response, dict):

            # Explicit error
            if response.get("error"):
                print(
                    "Storage deletion error:",
                    response.get("error")
                )
                return False

            return True

        # For a successful non-null response
        return True

    except Exception as error:

        print(
            f"Storage deletion failed for "
            f"{storage_path}: {error}"
        )

        return False