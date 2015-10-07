
// Set up variables to be used in data layer
var MAX_EXTRUSION = 5;

months = [];
var currentMonth;
var boundingBox;

var zips = d3.map();

var numberFormatter = d3.format("0,000");

var getExtrusion;
var getColor;

// Set up variables to be used in graphics layer

var renderer;
var scene;
var camera;
var raycaster;
var meshes = [];
var mouse = new THREE.Vector2();

var positioning;

// Define sources of data
var dataSources = [
  {type: 'json', args: ['sf.json'], key: 'sfzips'},
  {type: 'csv', args: ['sfrents.csv'], key: 'sfrents'}
];

// First define a function to load the data
function loadData(sources, callback){

  var remainingSources = sources.length;
  var results = {};

  // Loop through each data source
  sources.forEach(function(source) {
    function handler(error, data) {
      if (error) throw error;

      // Link source to results
      results[source.key] = data;

      // Decrement remaining sources
      remainingSources--;

      // When sources have been linked, execute callback on results
      if (remainingSources === 0){
        callback(results);
      }
    }

    // Copy args of source (i.e. file path)
    args = source.args.slice();

    // Add handler to file path, creating array
    args.push(handler);

    // In environment of source type (json/csv), apply the handler
    d3[source.type].apply(d3, args);

  });
}

// We see loadData calls a function extractMonths, so let's define it
function extractMonths(sfrents) {
  // Go through keys, and filter out first column (titled zip)
  // In the end, return an array of months we have data for
  return Object.keys(sfrents[0]).filter(function(key) {
    return key !== 'Zip' && key !== "Name";
  }).map(function(month) {
    // Return title of month (YYYY-MM) format
    return month;
  });
}

function prepareRentData(sfrents) {
  // Create variables to track highest rent and sum of rents over
  // all zip codes (to keep graphing relative)
  var maxRent = 0;

  // For each row in the sfrents csv
  sfrents.forEach(function(row) {

    // Get the zip code from the csv table
    var zipCode = row.Zip;
    var zipName = row.Name;

    // Create d3 datum node to fill with data
    var datum = d3.map();
    datum.set(name, zipName);

    // Loop trhough individual months for each row (i.e. zipcode)
    months.forEach(function(month) {

      // Get the rent value, as an integer, from the row, for that particular month
      var rentValue = parseInt(row[month], 10);

      // Set the data link between the month and rent value for that month
      datum.set(month, rentValue);

      // Reset max rent if rent value is larger than the maximum
      if (rentValue > maxRent) {
        maxRent = rentValue;
      }
    }); 

    // Link the zip code with the vector of rent values
    zips.set(zipCode, datum)
  });

  // Return the max rent so along with our side effects, we can have the maxRent 
  // value in the loadData callback
  return maxRent;
}

// Now actually load the data
loadData(dataSources, function(results) {

  // Get months for different data maps
  months = extractMonths(results.sfrents);

  // Get the max rent while also linking rent values to topo features
  var maxRent = prepareRentData(results.sfrents);

  // Calculate extrusion and color scales based off range upper bounded by max rent
  getExtrusion = d3.scale.linear().domain([0, maxRent]).range([0, 4]);
  getColor = d3.scale.linear().domain([0, maxRent]);


  var sfzips = results.sfzips;


  var features = topojson.feature(sfzips, sfzips.objects.sfzips).features;

  // Data is properly linked! Next big step: "init" the Geometry.
  initGeometry(features);

});

// ============================================================================
// End of data layer - onto geometry layer.
// ============================================================================



function initGeometry(features) {

  // Set projection details - we want an albers projection,
  // rotated and centered on SF's geo coordinates, scaled
  // to 200000x view (since SF is pretty small), and taking
  // up half of the window width and height.
  var projection = d3.geo.albers()
      .center([0, 37.7792])
      .rotate([122.431297, 0])
      .parallels([50, 60])
      .scale(1000000)
      .translate([window.innerWidth / 2, window.innerWidth / 2]);

  var path = d3.geo.path().projection(d3.geo.albers().center([-122.4167, 37.7833]));

  features.forEach(function(feature) {
    // Here, we're calling on D3-threeD. Big step!
    // Note path here is NOT the same as var path - path
    // is a call to a THREE function that creates a
    // a vector out of an array of points, and the outer
    // function transforms it to an SVG path element. This
    // is really all we need D3-threeD for! Wonder if I 
    // can factor it out.
    var contour = transformSVGPath(path(feature));

    // Get corresponding zip from the feature id!!!
    // It's all making sense. Data nodes and data layers
    // are siiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiick
    // TODO: Fix these edge cases - probably gotta just take em out
    if (feature.id !== "94104" && feature.id !== "94129" &&
        feature.id !== "94130") {
      var zip = zips.get(feature.id);

      // Attach the contour to the data layer for the given zip
      zip.set("contour", contour);
      zip.set('zip', feature.properties.id);
    }
    // Once MVP is working, add name to the data layer and get a
    // neighborhood name for the info box!
  });

  initThree();
}

// We have our geometries. Now, we need to set up THREE.

function initThree() {

  // To init three, we have to start the rendering engine.
  initRenderer();

  // Create new raycaster to track mouse hovers
  raycaster = new THREE.Raycaster();

  // Create a new scene - the stuff of THREE itself
  scene = new THREE.Scene();

  initPositioningTransform();

  // Lights, camera, action!
  initLights();
  initCamera();
  // TODO: After MVP, set up trackball controls.


  // Create controls for mouse dragging - camera as first argument sets
  // target for control, renderer's DOM element is target
  controls = new THREE.TrackballControls(camera, renderer.domElement);

  //Define maximum and minimum zoom.
  controls.minDistance = 5;
  controls.maxDistance = 10;

  // TODO: We're up to lights and camera! Only the action remains.
  

  // camera.position.z = -62;

  // camera.position.x = 1432;
  // camera.position.y = 1201;
  // camera.position.z = -65;
  camera.up.set(-0.3079731382492934, 0.9436692395156481, -0.12099963846565401);
  camera.position.set(1450.2198796703588, 1198.6282599321983, -62.00884720697113);
  // camera.rotation.set(2.753132942136272, -1.035130920564671736, -3.071904360557594);
  camera.rotation.set(-2.602185482068017, -0.5106756660487876, -1.1309577730941562);



  renderer.render(scene, camera);
  animate();
}

// The fist thing initThree does is call initRenderer, so 
// let's define it to set up the rendering engine.

function initRenderer() {

  renderer = new THREE.WebGLRenderer();

  // Set dimensions of renderer (full screen, because data
  // deserves it ALL)
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Set black background color, for now
  renderer.setClearColor(0x00000);

  // Add renderer to DOM. Whoah! We're making things appear.
  // Even better, we're manipulating the DOM with vanilla JS.
  // Take that, jQuery!
  document.body.appendChild(renderer.domElement);

  // Now that we've set up the renderer, let's set the scene
  // for the rest of THREE. 
}

// Before the action, we need lights and camera - let's set them up.

function initCamera() {
  
  // Start camera to view three scene - first arg is vertical view angle, second is aspect 
  // ratio (same as aspect of window here), and third and fourth are front and black plane z coordinates
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);


  // {x: 1432, y: 1201, z: -65}
  // {x: 1432.453078832504, y: 1198.6191709380764, z: -62.000510281529984}
  // {x: -0.3079731382492934, y: 0.9436692395156481, z: -0.12099963846565401}

  // camera.position.set(1432.2198796703588, 1195.6282599321983, -62.00884720697113);

  // camera.position.x = 1432;
  // camera.position.y = 1201;
  // camera.position.z = -65;

  // camera.up.set(-0.3079731382492934, 0.9436692395156481, -0.12099963846565401);

  // camera.rotation.set(2.753132942136272, -0.035130920564671736, -3.071904360557594);
  // camera.rotation.set(-2.602185482068017, -0.5106756660487876, -1.1309577730941562);


  // restoreCameraOrientation(camera);
}

function initLights() {


  // Add three lights in triangular points around scene, for drama
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

function onDocumentMouseMove( event ) {

  // For mouse updates - translate x and y coordinates from environment x and y
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function initPositioningTransform() {

  // Set up rotation matrices for positioning
  positioning = new THREE.Matrix4();

  // Initialize temporary translation matrix
  var tmp = new THREE.Matrix4();

  // Matrix multiplication to transform positioning
  // positioning.multiply(tmp.makeRotationX(Math.PI/64));
  positioning.multiply(tmp.makeTranslation(-1432.5, -1198.5, 51));

  // All this does it put it in a more friendly orientation.
}


function updateMeshes(month) {

  // Here's where we do the dirty work - the rendering. It's pretty exciting!

  // Let's first clear off our old meshes, to set up for later dynamic updates.
  // On the first run, this won't do anything since meshes is an empty array.

  meshes.forEach(function(mesh){
    scene.remove(mesh);
  });



  meshes = zips.entries().map(function(entry) {

    // Each entry is a key value pair with the zip code as 
    // key and the vector of values for each month as value.
    // We assign these to variables.
    var zipCode = entry.key;
    var zipData = entry.value;

    // Get the rent data for the month in question (the one passed as argument)
    var rent = zipData.get(month);

    // Calculate extrusion from the rent data based on our scale defined
    // in the data layer.
    var extrusion = getExtrusion(rent);

    // Get color the same way - right now, all of our colors will be shades
    // of green.
    var dataColor = getColor(rent);

    var color = d3.hsl(105, dataColor, dataColor).toString();

    // Build material for siding (Lambert == non-reflective)
    var extrudeMaterial = new THREE.MeshLambertMaterial({color: color}); 

    // Basic material for "top"/face of each county
    var faceMaterial = new THREE.MeshBasicMaterial({color: color});

    // Create geometric foundation from countour and extrude with
    // properties given as object in argument - amount is determined
    // by extrusion var (i.e. population), bevel is disabled, and
    // extrudeMaterials sets material for extrusion faces, and material
    // for front and back faces

    // Error here - contour isn't set up right!
    var geometry = zipData.get('contour').extrude({
      amount: extrusion,
      bevelEnabled: false,
      extrudeMaterial: 0,
      material: 1
    });


    // Actually create the shape (i.e. mesh). First argument is geometry
    // based on contour and extrusion, and second is a face material for
    // mesh which takes two arguments - the material for the extrusion sides
    // and the material for the faces
    var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial([extrudeMaterial, faceMaterial]));

    // Associate zip code to mesh to link with data
    mesh.userData.zipCode = zipCode;
    mesh.name = zipData.get(name);

    // TODO: Implement this. First, let's see how it works without it!
    mesh.applyMatrix(positioning);

    // Translate the mesh to the level of extrusion - use negative to pull extrusion "in", and 
    // the extrusion iself pulls it back out

    mesh.position.z -= 50;
    mesh.position.z -= extrusion;



    // Add mesh to scene
    scene.add(mesh);

    // Return mesh to the map
    return mesh;

  });
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
  // console.log("Intersects: ", intersects)
  for (var i=0; i<intersects.length; i++) {
    var zipCode = intersects[i].object.userData.zipCode;
    // console.log("Zip Code", zipCode)
    if (zipCode) {
      var zip = zips.get(zipCode);
      // console.log("Zip: ",zip)
      var rent = zip.get(currentMonth);
      // console.log("Rent: ",rent) 
      html = zipCode + ' (' + zip.get(name) + '): $' + numberFormatter(parseInt(rent, 10)) + '/mo';
      break;
    }
  }

  // Add HTML to infobox on screen
  document.getElementById('infobox').innerHTML = html;
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

document.addEventListener('mousemove', onDocumentMouseMove);
window.addEventListener('resize', onWindowResize);
// Just display the most recent meshes for now. We shall React!

// TODO: Make the rest work! You're so close.

// React Layer -- this doesn't count

