# SF Rents - A Visual Report

This is an experiment in D3.js and Three.js.

In it, I have created a 3D map of San Francisco delineated by zip code, with the third dimension (height) dictated by the zip code's ZRI (Zillow Rent Index). The ZRI is a proprietary estimation of the average rental unit in an area over all units, and serves as a general barometer for a neighborhood's rental cost (disclaimer: do not take this data to heart - this project is more about data visualizatio that data analysis). I created this map using the twin technologies of d3.js and Three.js. d3 was initially used for parsing CSV files for rental data and reading topoJSON files for geographical zip boundaries and creating SVG paths for each zip code. I then used Three.js to project these SVG paths to 3D geometries and display the results.

I started from [this example](http://scribu.net/blog/3d-maps-using-d3-and-three.js.html), which creates a similar map for Romania (albeit with different boundaries and metrics). Other useful d3 tutorials were found at d3 creator [Mike Bostock's](http://bost.ocks.org/mike/map/) website. 

To use my app, simply clone the repo, navigate to the directory and open a server (use `http-server` or `python -m SimpleHTTPServer`). Then, in your browser, go to localhost at the port you specified (8000 by default),open up sfrents.html, and pick a month (no data will appear until you do). Use mouse click-and-drag to rotate, and scroll to zoom. If you would like to contribute, I'd love to see your forks, issues, and pull requests.

Some coming TODOS:

- Fix initial SF orientation - it's currently laying on its side, and has to be dragged into a better position with the mouse
- Deploy the data (web framework?)

A screencast of the technology can be found [here](https://www.youtube.com/watch?v=wuwfU0DDcJU).

#### Screencast Cliffs Notes

1. 0:00-4:25: Top-down look at technology, motivations, background etc.
2. 4:25-9:15: Demo
3. 9:16-12:11: Overview of approach, d3, three
4. 12:12-24:54: LOC. Functions. The nitty gritty (and not really necessary)

