up:
	# bring up the services
	docker-compose up -d

build:
	docker-compose build

sync:
	# set up the database tables
	docker-compose run django bash -c "python manage.py makemigrations && python manage.py migrate account && python manage.py migrate --noinput"
	# load the default catalog (hypermap)
	docker-compose run django python manage.py loaddata catalog_default.json
	# load a superuser admin / exchange
	docker-compose run django python manage.py loaddata initial.json

wait:
	sleep 5

logs:
	docker-compose logs --follow

down:
	docker-compose down

test:
	docker-compose run django python manage.py test hypermap.aggregator --settings=hypermap.settings.test --failfast

reset: down up wait sync

pull:
	docker-compose pull

clean:
	./clean-build

hardreset: clean down pull build reset
