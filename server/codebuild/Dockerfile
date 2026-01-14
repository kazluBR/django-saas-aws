FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf update -y && \
    dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm && \
    dnf install -y mysql-community-client jq awscli --nogpgcheck && \
    dnf clean all

WORKDIR /tmp

CMD ["/bin/bash"]