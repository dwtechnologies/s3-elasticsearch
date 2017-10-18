# S3 to elasticsearch

This lambda function triggers on a s3 [event](http://docs.aws.amazon.com/lambda/latest/dg/eventsources.html#eventsources-s3-put). Function accepts json files on s3 or function could be modified to support lines that could be parsed with regexp.


#### Deployment
Make sure correct values added in makefile
```ELASTICSEARCH_URL=
ELASTICSEARCH_INDEX=
ELASTICSEARCH_DOCTYPE=
REGION=eu-west-1
AWS_LOCAL_PROFILE=default
````
And valid s3 bucket for lambda deployment.
