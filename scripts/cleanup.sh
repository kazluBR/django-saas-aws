ADMIN_EMAIL=$1

if [ -z "$ADMIN_EMAIL" ]; then
    echo "Precisa informar o e-mail do administrador."
    echo "Uso: bash ./cleanup.sh exemplo@dominio.com"
    exit 1
fi

tenant_registrations=$(bash sbt-aws.sh get-all-tenant-registrations | jq -c '[.data[] | select(.registrationStatus == "created") | {tenantRegistrationId, tenantId}]')

if [ -z "$tenant_registrations" ] || [ "$tenant_registrations" == "{}" ]; then
  echo "No tenant found to delete."
  else 
    echo "$tenant_registrations" | jq -c '.[]' | while read -r entry; do
      tenant_registration_id=$(echo "$entry" | jq -r '.tenantRegistrationId')
      
      echo "Deleting tenant registration: $tenant_registration_id"
      bash sbt-aws.sh delete-tenant-registration "$tenant_registration_id"

      tenant_id=$(echo "$entry" | jq -r '.tenantId')
      tenant_name=$(bash sbt-aws.sh get-tenant "$tenant_id" | jq -r '.data.tenantName')
      stack_name="tenantTemplateStack-$tenant_name"

      echo "Waiting for stack deletion: $stack_name"
      aws cloudformation wait stack-delete-complete --stack-name "$stack_name"

      echo "Tenant $tenant_registration_id deleted successfully!"
    done
fi

repo_name=$(aws cloudformation describe-stacks \
    --stack-name "BootstrapStack" \
    --query "Stacks[0].Outputs[?contains(OutputKey,'AppEcrRepositoryName')].OutputValue" \
    --output text)
    
region=$(aws configure get region)

aws ecr list-images --repository-name $repo_name --region $region --query 'imageIds[*]' --output json | jq -c '.[]' | while read img; do
    aws ecr batch-delete-image --repository-name $repo_name --region $region --image-ids "$img"
    echo "ECR Image $img deleted successfully!"
done

user_pool_id=$(aws cloudformation describe-stacks \
    --stack-name "ControlPlaneStack" \
    --query "Stacks[0].Outputs[?contains(OutputKey,'ControlPlaneIdpUserPoolId')].OutputValue" \
    --output text)

cd ../server && cdk destroy --all --force -c adminEmail="$ADMIN_EMAIL"
echo "All Stacks destroyed successfully."

if [ "$user_pool_id" != "None" ]; then
  aws cognito-idp delete-user-pool --user-pool-id $user_pool_id --region $region
  echo "Cognito User Pool deleted successfully."
fi

