RESOURCE_CONTEXT=v1
ELASTICSEARCH_URL=
ELASTICSEARCH_INDEX=
ELASTICSEARCH_DOCTYPE=
REGION=eu-west-1
AWS_LOCAL_PROFILE=default
#############
# BUILD LAMBDA
#############

.PHONY: build
build:
	@echo "-----Building Lambda Backend function ------"
	mkdir -p tmp
	aws cloudformation package --template-file service-cf.yaml --output-template-file tmp/cf-template.yaml --s3-bucket kc-data-repository  --profile $(AWS_LOCAL_PROFILE)
	@echo "----Build Lambda Backend function  Done ----"

#############
# TEST
#############
.PHONY: test
test:
	cd function && \
	npm install && \
	npm test && \
	rm -f access.log.gz

#############
# INSTALL
#############
.PHONY: install
install:
	cd function && \
	npm install --production

#############
# DEPLOY
#############
.PHONY: build
deploy: build
	@echo "Deploy"
	aws cloudformation deploy --template-file tmp/cf-template.yaml --stack-name s3-to-elasticsearch-$(RESOURCE_CONTEXT) --capabilities CAPABILITY_IAM --region $(REGION) --parameter-overrides  ResourceContext=$(RESOURCE_CONTEXT) ElasticSearchURL=$(ELASTICSEARCH_URL) ElasticSearchIndex=$(ELASTICSEARCH_INDEX) ElasticSearchDocType=$(ELASTICSEARCH_DOCTYPE) --profile $(AWS_LOCAL_PROFILE)
	@echo "Deploy done"


#############
# CLEAN
#############
.PHONY: clean
clean:
	cd function && \
	npm uninstall jasmine aws-sdk
