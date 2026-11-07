#!/bin/sh
# LocalStack init hook: creates the fictitious AWS resources used by the @localstack examples.
set -e
REGION=us-east-1

for environment in qa local; do
    awslocal dynamodb create-table --region "$REGION" --table-name "appConfig_${environment}" \
        --attribute-definitions AttributeName=Id,AttributeType=S --key-schema AttributeName=Id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST
    awslocal dynamodb create-table --region "$REGION" --table-name "cronLocks_${environment}" \
        --attribute-definitions AttributeName=Id,AttributeType=S --key-schema AttributeName=Id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST
    awslocal s3 mb "s3://acme-files-${environment}" --region "$REGION"
    awslocal secretsmanager create-secret --region "$REGION" --name "acme/db/${environment}" \
        --secret-string '{"host":"postgres","username":"postgres","password":"postgres"}'
done

# A Lambda that fails when the payload asks it to, so FunctionError can be asserted.
mkdir -p /tmp/lambda && cat > /tmp/lambda/index.js <<'JS'
exports.handler = async (event) => {
    if (event && event.fail) { throw new Error('Requested failure'); }
    return { confirmed: true, received: event };
};
JS
(cd /tmp/lambda && zip -q function.zip index.js)
for environment in qa local; do
    awslocal lambda create-function --region "$REGION" --function-name "acme-orders-${environment}-confirm-orders" \
        --runtime nodejs20.x --handler index.handler --zip-file fileb:///tmp/lambda/function.zip \
        --role arn:aws:iam::000000000000:role/lambda-role
done
