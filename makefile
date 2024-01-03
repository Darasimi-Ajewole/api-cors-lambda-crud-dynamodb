install:
	npm install

start:
	npm start

build-watch:
	npm run build-watch

up-localstack:
	docker run --rm -it --name localstack \
	-p 4566:4566 -p 4510-4559:4510-4559 \
	-v /var/run/docker.sock:/var/run/docker.sock localstack/localstack
