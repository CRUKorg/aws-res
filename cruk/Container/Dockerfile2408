ARG  RES_VERSION=2024.08-d09c2666
FROM public.ecr.aws/l6g7n3r5/research-engineering-studio:${RES_VERSION}
# Use existing private hosted zone 
COPY ./cluster_stack.py /usr/local/lib/python3.9/site-packages/ideaadministrator/app/cdk/stacks/
COPY ./virtual_desktop_controller_stack.py /usr/local/lib/python3.9/site-packages/ideaadministrator/app/cdk/stacks/
COPY ./custom-credential-broker.yml /root/.idea/idea-administrator/resources/policies/custom-credential-broker.yml