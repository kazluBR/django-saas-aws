#!/bin/bash

if [ "$tier" = "basic" ]; then
    secret_json=$(aws secretsmanager get-secret-value --secret-id "pool-database-secret" --query SecretString --output text --region "${AWS_REGION}")

    db_host=$(echo "$secret_json" | jq -r '.host')
    db_user=$(echo "$secret_json" | jq -r '.username')
    db_password=$(echo "$secret_json" | jq -r '.password')
    db_port=$(echo "$secret_json" | jq -r '.port')

    mysql -h "$db_host" -u "$db_user" -p"$db_password" -P "$db_port" -e "CREATE DATABASE IF NOT EXISTS \`$tenantName\`;"
fi

bucket_name=$(aws cloudformation describe-stacks \
  --stack-name BootstrapStack \
  --query "Stacks[0].Outputs[?OutputKey=='TenantTemplatesBucketName'].OutputValue" \
  --output text)

bucket_url=$(aws s3 presign "s3://$bucket_name/tenant-$tier-cf.yaml" --expires-in 600)

aws cloudformation create-stack --stack-name "tenantTemplateStack-$tenantName" \
  --template-url "$bucket_url" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=TenantName,ParameterValue=$tenantName \
               ParameterKey=SuperUserEmail,ParameterValue=$email \
               ParameterKey=SuperUserPassword,ParameterValue=$tenantName
aws cloudformation wait stack-create-complete --stack-name "tenantTemplateStack-$tenantName"

alb_dns=$(aws cloudformation describe-stacks \
    --stack-name "tenantTemplateStack-$tenantName" \
    --query "Stacks[0].Outputs[?contains(OutputKey,'ALBDnsName')].OutputValue" \
    --output text)

export tenantAppUrl=$alb_dns
export tenantStatus="created"
export registrationStatus="created"