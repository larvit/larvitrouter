# larvitrouter

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

If a route is not matched, but a corresponding controller is found, that controller will be ran. For example if the URL "/foo" is called and the controller ./controllers/foo.js exists that will be used.

## Usage

Documentation not finnished...