#!/bin/bash

if [ "$tier" = "basic" ]; then
    secret_json=$(aws secretsmanager get-secret-value --secret-id "pool-database-secret" --query SecretString --output text --region "${AWS_REGION}")

    db_host=$(echo "$secret_json" | jq -r '.host')
    db_user=$(echo "$secret_json" | jq -r '.username')
    db_password=$(echo "$secret_json" | jq -r '.password')
    db_port=$(echo "$secret_json" | jq -r '.port')

    mysql -h "$db_host" -u "$db_user" -p"$db_password" -P "$db_port" -e "DROP DATABASE IF EXISTS \`$tenantName\`;"
fi

aws cloudformation delete-stack --stack-name "tenantTemplateStack-$tenantName"
aws cloudformation wait stack-delete-complete --stack-name "tenantTemplateStack-$tenantName"

export tenantStatus="deleted"
export registrationStatus="deleted"