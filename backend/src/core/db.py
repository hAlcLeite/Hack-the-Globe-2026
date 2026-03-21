"""
db.py — AWS DynamoDB Connection Manager

Initializes the boto3 resource using settings from .env.
Provides helper functions for querying and writing single-table data.

Note: DynamoDB does NOT support Python float types. We use a helper
function (floats_to_decimal) to recursively convert all floats to
Decimal before writing. This is a well-known boto3 requirement.
"""

import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
from src.core.config import settings


def floats_to_decimal(obj):
    """
    Recursively walk through dicts and lists and convert
    every Python float to a Decimal (required by DynamoDB).
    """
    if isinstance(obj, float):
        return Decimal(str(obj))  # str() avoids floating point precision issues
    elif isinstance(obj, dict):
        return {k: floats_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [floats_to_decimal(i) for i in obj]
    return obj

def get_dynamodb_resource():
    """Create the boto3 DynamoDB resource."""
    # We pass credentials explicitly from our settings, though boto3
    # automatically looks for standard AWS env vars too.
    return boto3.resource(
        'dynamodb',
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        aws_session_token=settings.AWS_SESSION_TOKEN
    )

# Initialize the global DB resource and Table
dynamodb = get_dynamodb_resource()
table = dynamodb.Table(settings.DYNAMODB_TABLE_NAME)

def put_fire_event(fire_data: dict):
    """
    Upserts a fire item into DynamoDB.
    Requires 'fire_id' to be set as the Partition Key.
    """
    if "fire_id" not in fire_data:
        raise ValueError("Cannot write to DB: 'fire_id' partition key is missing.")
    
    # Convert all floats to Decimal (DynamoDB boto3 requirement)
    safe_data = floats_to_decimal(fire_data)

    try:
        table.put_item(Item=safe_data)
        return True
    except ClientError as e:
        print(f"DynamoDB Put Error: {e.response['Error']['Message']}")
        return False

def get_fire_event(fire_id: str) -> dict | None:
    """
    Retrieves a single fire event by its Partition Key.
    O(1) lookup time (extremely fast).
    """
    try:
        response = table.get_item(Key={"fire_id": fire_id})
        return response.get("Item")
    except ClientError as e:
        print(f"DynamoDB Get Error: {e.response['Error']['Message']}")
        return None

def get_all_fire_events() -> list[dict]:
    """
    Scans the entire table for all events.
    Note: 'scan' is fine for a small hackathon table but slow in production.
    """
    try:
        response = table.scan()
        return response.get("Items", [])
    except ClientError as e:
        print(f"DynamoDB Scan Error: {e.response['Error']['Message']}")
        return []
