// Set up THREE objects
var renderer, scene, camera, raycaster, meshes = [];

// Set up 2D Vector to track mouse coordinates
var mouse = new THREE.Vector2();

// Create map between county and data associated with it
var counties = d3.map();

// transormation matrix
var positioning;


//Set center of Romania with latitude and longitude
var RO_CENTER = [25.0094303, 45.9442858];

// Set max extrusion for highest points of graph
var MAX_EXTRUSION = 10;


// Set years for specific data points
var years = [], currentYear;

// Format numbers so population can be expressed with commas
var numberFormatter = d3.format('0,000');

// function that maps population int to extrusion value
// requires the maximum possible population
var getExtrusion;

// function that maps population int to luminance
// requires the maximum possible population
var getLuminance;


//Start the rendering engine
function initRenderer() {
  // Create a new renderer using WebGL
  renderer = new THREE.WebGLRenderer();

  // Set dimensions of renderer (set to window dimensions i.e. full screen)
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Set background color (black here)
  renderer.setClearColor(0x000000);

  // Add renderer to DOM
  document.body.appendChild(renderer.domElement);
}

function initThree() {
  // Call previous function to start rendering engine
  initRenderer();

  // Create new raycaster to track mouse painting
  raycaster = new THREE.Raycaster();

  // Create new scene
  scene = new THREE.Scene();

  // Start camera and lighting - see those functions
  initCamera();
  initLights();

  // Create controls for mouse dragging - camera as first argument sets
  // target for control, renderer's DOM element is target
  controls = new THREE.TrackballControls(camera, renderer.domElement);

  //Define maximum and minimum zoom.
  controls.minDistance = 10;
  controls.maxDistance = 50;

  // Call main animate function
  animate();
}

function initCamera() {
  // Start camera to view three scene - first arg is vertical view angle, second is aspect 
  // ration (same as aspect of window), and third and fourth are front and black plane z coordinates
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);

  // Set position of camera in screen
  camera.position.set(-8.278324114488553, 23.715105536749885, 5.334970045945842);

  // Figure this one out - what is up?
  camera.up.set(-0.3079731382492934, 0.9436692395156481, -0.12099963846565401);

  // restoreCameraOrientation(camera);
}

function initLights() {

  // Add first light to scene - set color and position
  var pointLight = new THREE.PointLight(0xFFFFFF);
  pointLight.position.set(-800, 800, 800);
  scene.add(pointLight);

  var pointLight2 = new THREE.PointLight(0xFFFFFF);
  pointLight2.position.set(800, 800, 800);
  scene.add(pointLight2);

  var pointLight3 = new THREE.PointLight(0xFFFFFF);
  pointLight3.position.set(0, 800, -800);
  scene.add(pointLight3);
}

// Create a new line (not actually used)
function initLine() {

  // Create a new material fo a line with blue color
  var material = new THREE.LineBasicMaterial({
      color: 0x0000ff
  });

  // Create basic three geometry - no shape yet
  var geometry = new THREE.Geometry();

  // Add vertices to geometry in vector form to get shape of line
  geometry.vertices.push(
    new THREE.Vector3( 0, 0, 0 ),
    new THREE.Vector3( 0, 100, 0 )
  );

  // Create actual line object from geomtry and material
  var line = new THREE.Line( geometry, material );

  // Add line to scene
  scene.add( line );
}

function updateInfoBox() {

  // Set a raycaster from the point of the camera to where the mouse pointing
  raycaster.setFromCamera( mouse, camera );

  // Get intersect points on the map from the raycaster
  var intersects = raycaster.intersectObjects(scene.children);

  // Initialize HTML variable to store data to display to screen
  var html = '';

  // For each intersect (most likely just one in this example), get
  // data from the object (county code) and get correponding data
  // for that county from dataset. Create html string displaying
  // the county's name and population
  for (var i=0; i<intersects.length; i++) {
    var countyCode = intersects[i].object.userData.countyCode;
    if (countyCode) {
      var county = counties.get(countyCode);
      var population = county.get(currentYear); 
      html = county.get('name') + ': ' + numberFormatter(population);
      break;
    }
  }

  // Add HTML to infobox on screen
  document.getElementById('infobox').innerHTML = html;
}

function animate() {
  // Get input for trackball controls and update camera (since controls
  // are linked to camera)
  controls.update();

  // Render the scene again after camera perspective changes
  renderer.render(scene, camera);

  // Update infobox with new information based on mouse location
  updateInfoBox();

  // Do the animation with requestAnimationFrame
  requestAnimationFrame(animate);
}

// Listener set up to dynamically update mouse coordinates when mouse moves
function onDocumentMouseMove( event ) {

  // For mouse updates - translate x and y coordinates from environment x and y
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

// Listener set up so camera and renderer responds to window resizing
function onWindowResize() {

  // For responsive design - change camera aspect as 
  camera.aspect = window.innerWidth / window.innerHeight;

  // Update projection engine with new aspect settings
  camera.updateProjectionMatrix();


  // Just like camera, update renderer to render only to size of window.
  renderer.setSize(window.innerWidth, window.innerHeight);
}


// Create handler to change camera position and up properties (what is up)?
function cameraIter(callback) {
  ['position', 'up'].forEach(callback);
}

// Save camera orientation in sessions to persist over page refreshes
function saveCameraOrientation() {

  // For position and up properties in camera...
  cameraIter(function (key) {
    // Set item in session storage with key corresponding to property and value
    // as a JSON string of the property's value (which are coordinates)
    sessionStorage.setItem('camera.' + key, JSON.stringify(camera[key].toArray()));
  });
}

// Restore camera orientation from session data
function restoreCameraOrientation() {

  // For position nad up properties in camera...
  cameraIter(function (key) {
    // Get value for camera proeprty from string in session storage, parsed as JSON
    var val = JSON.parse(sessionStorage.getItem('camera.' + key));

    // If value exists, set camera's actual corrrsponding property to value
    if (val) {
      camera[key].fromArray(val);
    }
  });
}



function initGeometry(features) {

  // Get path geometries for romania's map using d3's geo library, getting
  // path vectors, and setting the projection to a mercator projection
  // centered at the coordinates defined as Romania's center
  var path = d3.geo.path().projection(d3.geo.mercator().center(RO_CENTER));

  
  // For each feature in the features argument
  features.forEach(function(feature) {

    // Example that D3-to-Three converter has problems with objects with holes
    if (feature.id === 'IF') {
      // remove Bucharest hole
      feature.geometry.coordinates = feature.geometry.coordinates.slice(0, 1);
    }

    // Get the svg path for each feature of geometry
    var contour = transformSVGPath(geo.path(feature));

    // Get county data from counties dataset based on id key
    var county = counties.get(feature.id);

    // Set contour property of county to SVG contour path
    county.set('contour', contour);

    // Set name property of county from feature properties
    county.set('name', feature.properties.name);
  });
}

function initPositioningTransform() {

  // Set up rotation matrices for positioning
  positioning = new THREE.Matrix4();

  // Initialize temporary translation matrix
  var tmp = new THREE.Matrix4();

  // Matrix multiplication to transform positioning
  positioning.multiply(tmp.makeRotationX(Math.PI/2));
  positioning.multiply(tmp.makeTranslation(-480, -250, 0));
}

function updateMeshes(year) {
  // Remove each mesh from scene - as year changes, we need to create
  // new shapes (since data changes)
  meshes.forEach(function(mesh) {
    scene.remove(mesh);
  });


  // Set new meshes from county data by mapping over entries
  meshes = counties.entries().map(function(entry) {

    // Get county code and county data from each entry
    var countyCode = entry.key, county = entry.value;

    // Get county population data for year passed as argument
    var population = county.get(year);

    // Get extrusion level for each mesh based on population
    var extrusion = getExtrusion(population);

    // Get luminance for each mesh based on population (this makes it
    // choroplethy)
    var luminance = getLuminance(population);

    // Set color of mesh based off green based and luminance based on
    // population (so data scales over shades of green).
    var color = d3.hsl(105, 0.8, luminance).toString();

    // extrudeMaterial is material for the "siding" of each county
    var extrudeMaterial = new THREE.MeshLambertMaterial({color: color}); 

    // Basic material for "top"/face of each county
    var faceMaterial = new THREE.MeshBasicMaterial({color: color});

    // Create geometric foundation from countour and extrude with
    // properties given as object in argument - amount is determined
    // by extrusion var (i.e. population), bevel is disabled, and
    // extrudeMaterials sets material for extrusion faces, and material
    // for front and back faces
    var geometry = county.get('contour').extrude({
      amount: extrusion,
      bevelEnabled: false,
      extrudeMaterial: 0,
      material: 1
    });

    // Actually create the shape (i.e. mesh). First argument is geometry
    // based on contour and extrusion, and second is a face material for
    // mesh which takes two arguments - the material for the extrusion sides
    // and the material for the faces
    var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(
      [extrudeMaterial, faceMaterial]));

    // associate countyCode with mesh to link with data
    mesh.userData.countyCode = countyCode;

    // Apply positioning transformation matrix to mesh to set up initial position
    mesh.applyMatrix(positioning);

    // Translate the mesh to the level of extrusion - use negative to pull extrusion "in", and 
    // the extrusion iself pulls it back out
    mesh.translateZ(-extrusion);

    // Add mesh to scene
    scene.add(mesh);

    // Return mesh to the map
    return mesh;
  });
}

// concurrently load multiple data sources; the callback will be invoked when everything is loaded
function loadData(sources, callback) {
  // Use remaining to track sources left to load
  var remaining = sources.length;
  var results = {}

  // For each source
  sources.forEach(function(source) {
    function handler(error, data) {
      if (error) throw error;

      // add key from sources hash as key to results hash,
      // link to data
      results[source.key] = data;

      // Decrement remaining sources
      remaining--;

      // Once none are remaining, execute loadData callback with
      // results as argument
      if (!remaining) {
        console.log(results);
        callback(results);
      }
    }

    // Use slice to copy the args from source
    args = source.args.slice();

    args.push(handler);
    // Access d3 library for dataType and apply arguments
    d3[source.type].apply(d3, args);
  });
}

var dataSources = [
  {type: 'json', args: ['data/romania-topo.json'], key: 'judete'},
  {type: 'json', args: ['data/judete-id.json'], key: 'id_judete'},
  {type: 'csv', args: ['data/recensaminte.csv'], key: 'recensaminte'}
];

function extractYears(recensaminte) {
  return Object.keys(recensaminte[0]).filter(function(key) {
    return key !== 'name';
  }).map(function(year) {
    return parseInt(year, 10);
  });
}

function prepareCensusData(recensaminte, id_judete) {
  var max_population = 0;
  var year_sums = {};

  recensaminte.forEach(function(row) {
    var countyCode = id_judete[row.name];

    var datum = d3.map();

    years.forEach(function(year) {
      var value = parseInt(row[year], 10);

      datum.set(year, value);

      if (value > max_population) {
        max_population = value;
      }
    });

    counties.set(countyCode, datum);
  });

  return max_population;
}

initThree();
initPositioningTransform();
// initLine();

var YearButtons = React.createClass({
  getYearFromHash: function() {
    var re = new RegExp('#/an/(\\d{4})');
    var match = window.location.hash.match(re);
    var currentYear;

    if (match) {
      currentYear = +match[1];
      if (this.props.years.indexOf(currentYear) > -1) {
        return currentYear;
      }
    }

    return false;
  },

  getInitialState: function() {
    var currentYear = this.getYearFromHash();

    if (!currentYear) {
      currentYear = this.props.years[0];
    }

    return {currentYear: currentYear};
  },

  componentDidMount: function() {
    window.addEventListener('hashchange', this.onHashChange);
  },

  componentWillUnmount: function() {
    window.removeEventListener('hashchange', this.onHashChange);
  },

  onHashChange: function(year) {
    var year = this.getYearFromHash();

    if (year) {
      this.setState({currentYear: year});
    }
  },

  render: function() {
    var self = this;

    currentYear = self.state.currentYear;  // used by infobox
    updateMeshes(this.state.currentYear);

    function createButton(year) {
      var classes = classNames({
        'btn': true,
        'btn-default': true,
        'active': year == self.state.currentYear
      });

      return <a className={classes} key={year} href={'#/an/' + year}>{year}</a>;
    }

    return <div id="current-year" className="btn-group" role="group">{self.props.years.map(createButton)}</div>;
  }
});

loadData(dataSources, function(results) {
  console.log(results);
  years = extractYears(results.recensaminte);
  var max_population = prepareCensusData(results.recensaminte, results.id_judete);

  getExtrusion = d3.scale.linear().domain([0, max_population]).range([0, MAX_EXTRUSION]);
  getLuminance = d3.scale.linear().domain([0, max_population]);

  var judete = results.judete;

  var features = topojson.feature(judete, judete.objects['romania-counties-geojson']).features;
  initGeometry(features);

  React.render(<YearButtons years={years} />, document.getElementById('container'));
});

document.addEventListener('mousemove', onDocumentMouseMove);
window.addEventListener('resize', onWindowResize);
window.addEventListener('beforeunload', saveCameraOrientation);
