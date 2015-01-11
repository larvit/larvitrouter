# larvitRouter

Very simple router and client feeder for node.js

## Required files

./config/routes.json

Content as shown:

    [
    	{
    		"regex":          "^/$",
    		"controllerName": "default"
    	},
    	{
    		"regex":          "^/default$",
    		"controllerName": "default"
    	}
    ]

The first will match exactly "/" and will set request.controllerName to ./controllers/default.js.
The second will match exactly "/mupp" and will set request.controllerName to ./controllers/mupp.js

## Usage

Documentation not finnished...