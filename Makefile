lint:
	 @podman run -it --rm -v $(PWD):/usr/src/app trashnochados/nodejs:raw-node16 yarn lint