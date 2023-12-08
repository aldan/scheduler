FROM python:3.11-slim

COPY --from=openjdk:8-jre-slim /usr/local/openjdk-8 /usr/local/openjdk-8
ENV JAVA_HOME /usr/local/openjdk-8
RUN update-alternatives --install /usr/bin/java java /usr/local/openjdk-8/bin/java 1

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_DIR /app

WORKDIR $APP_DIR

# Install poetry
RUN pip3 install poetry
RUN poetry config virtualenvs.create false

COPY poetry.lock pyproject.toml $APP_DIR

# Install project dependencies
RUN poetry install -n --no-ansi

# Copy project files
COPY . $APP_DIR

ENTRYPOINT ["./entrypoint.sh"]
