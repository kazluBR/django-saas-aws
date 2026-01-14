import os
import json
import boto3
from .settings import *

DEBUG = False

ALLOWED_HOSTS = ['*']

if os.getenv("TENANT_NAME"):

    client = boto3.client("secretsmanager", region_name=os.getenv("AWS_REGION"))
    secret_id = "pool-database-secret" if os.getenv("TIER") == "basic" else f"{os.getenv('TENANT_NAME')}-database-secret"
    secret_value = client.get_secret_value(SecretId=secret_id)
    secret = json.loads(secret_value["SecretString"])

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("TENANT_NAME"),
            "USER": secret["username"],
            "PASSWORD": secret["password"],
            "HOST": secret["host"],
            "PORT": secret["port"],
        }
    }