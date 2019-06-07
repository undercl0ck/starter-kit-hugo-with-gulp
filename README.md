## Starter-kit for Hugo Framework with Gulp

Compile SASS and JS:

````
terminal: gulp
````

Build Hugo:

````
terminal: hugo
````

Run Hugo server:

````
terminal: hugo server -d -W
````

You must work with the source files in the "src" folder, using the collector, source files are compiled into "static" folder. 
The server will take the files from the "static" folder and use them to build.

If you want to change the name of your topic, you need to make changes to

````
gulp-config.js -> theme
````