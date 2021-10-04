// import our three.js reference
import * as THREE from "https://unpkg.com/three/build/three.module.js";



const app = {
  init() {
    app.scene = new THREE.Scene();
    const listener = new THREE.AudioListener();
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
   // app.playButton = 
    app.planes = new THREE.Group();


    app.camera = new THREE.PerspectiveCamera();
    app.camera.position.z = 50;
    app.camera.add(listener);

    app.renderer = new THREE.WebGLRenderer();
    app.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(app.renderer.domElement);

   // app.createLights();
   const pointLight = new THREE.PointLight(0xffffff);
   pointLight.position.z = 100;
   app.scene.add(pointLight); 
   
   app.knot = app.createKnot();

    // ...the rare and elusive hard binding appears! but why?
    app.render = app.render.bind(app);

    
    // audio init
    const audioCtx = new AudioContext();
    const audioElement = document.createElement("audio");
    document.body.appendChild(audioElement);

    // audio graph setup...using audioElement to load the music instead of sound...does that matter?
    app.analyser = audioCtx.createAnalyser();
    app.analyser.fftSize = 1024; // 512 bins
    const player = audioCtx.createMediaElementSource(audioElement);
    player.connect(audioCtx.destination);
    player.connect(app.analyser);

    // make sure, for this example, that your audiofle is accesssible
    // from your server's root directory... here we assume the file is
    // in the ssame location as our index.html file
    audioElement.src = 'observer.mp3'
    audioElement.play();

    app.results = new Uint8Array(app.analyser.frequencyBinCount);

    var planeGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
    var planeMaterial = new THREE.MeshLambertMaterial({
        color: 0x6904ce,
        side: THREE.DoubleSide,
        wireframe: true
    });

    //plane init
    
    app.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    app.plane.rotation.x = -0.5 * Math.PI;
    app.plane.position.set(0, 30, 0);
    app.planes.add(app.plane);
    
    app.plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
    app.plane2.rotation.x = -0.5 * Math.PI;
    app.plane2.position.set(0, -30, 0);
    app.planes.add(app.plane2);

    app.icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    app.lambertMaterial = new THREE.MeshLambertMaterial({
        color: 0xff00ee,
        wireframe: true
    });

    app.ball = new THREE.Mesh(app.icosahedronGeometry, app.lambertMaterial);
    app.ball.position.set(0, 0, 0);
    app.planes.add(app.ball);
    app.scene.add(app.planes)

    app.render();
  },

  makeRoughBall(mesh, bassFr, treFr) { 
    console,log(mesh.geometry.vertices)

    // mesh.geometry.vertices.forEach(function (vertex, i) {
    //  // console,log(mesh.geometry.vertices)
    //   var offset = mesh.geometry.parameters.radius;
    //   var time = window.performance.now(); 
    //   vertex.normalize();
    //   var distance = (offset + bassFr ) + noise.noise3D(
    //         vertex.x + time * 0.00007,
    //         vertex.y + time * 0.00008,
    //         vertex.z + time * 0.00009
    //   ) * amp * treFr;
    //   vertex.multiplyScalar(distance);
    // });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  },

  makeRoughGround(mesh, distortionFr) {
    // mesh.geometry.vertices.forEach(function (vertex, i) {
    // var amp = 2;
    // var time = Date.now();
    // var distance = (noise.noise2D(vertex.x + time * 0.0003, vertex.y + time * 0.0001) + 0) * distortionFr * amp;
    // vertex.z = distance;
    // });

    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  },

  createKnot() {
    const knotgeo = new THREE.TorusKnotGeometry(10, 0.1, 128, 16, 5, 21);
    const mat = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      shininess: 2000
    });
    const knot = new THREE.Mesh(knotgeo, mat);

    app.scene.add(knot);
    return knot;
  },

  fractionate(val, minVal, maxVal) {
    return (val - minVal)/(maxVal - minVal);
  },

  modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = app.fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + (fr * delta);
  },


  render() {
    app.analyser.getByteFrequencyData(app.results);

    const average = (array) => array.reduce((a, b) => a + b) / array.length;
      // slice the array into two halves
    var lowerHalfArray = app.results.slice(0, (app.results.length/2) - 1);
    var upperHalfArray = 
    app.results.slice((app.results.length/2) - 1, app.results.length - 1);
    // do some basic reductions/normalisations
    var lowerMax = Math.max(lowerHalfArray);
    var lowerAvg = average(lowerHalfArray); 
    var upperAvg = average(upperHalfArray);
    var lowerMaxFr = lowerMax / lowerHalfArray.length;
    var lowerAvgFr = lowerAvg / lowerHalfArray.length;
    var upperAvgFr = upperAvg / upperHalfArray.length;
    /* use the reduced values to modulate the 3d objects */
    // these are the planar meshes above and below the sphere
    app.makeRoughGround(app.plane, app.modulate(upperAvgFr, 0, 1, 0.5, 4));
    app.makeRoughGround(app.plane2, app.modulate(lowerMaxFr, 0, 1, 0.5, 4));

    //have the knot rotate in accordance with the sound frequency
    for (let i = 0; i < app.analyser.frequencyBinCount; i++) {
      app.knot.rotation.x += app.results[i];
      
    }

    app.makeRoughBall(app.ball, app.modulate(Math.pow(lowerMaxFr, 0.5), 0, 1, 0, 8),
    app.modulate(upperAvgFr, 0, 1, 0, 4));
    app.renderer.render(app.scene, app.camera);
    window.requestAnimationFrame(app.render);
  },




};

//window.onload = () => app.init();

const playButton = document.getElementById( 'playButton' );
playButton.addEventListener( 'click', app.init );

