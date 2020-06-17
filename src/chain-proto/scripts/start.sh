if docker-compose -p blockchain up -d --build ; then

node server.js clientcfg.json

else
  echo "Failed to start containers. Check if docker is installed and running."
fi
