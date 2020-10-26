let gl;
let draw = false;
let program;
let canvas;
let maxVertices = 30000;
let userPos = [];
let vertices = [];
let polygonFormed = false;
let noOfSides = 3; // Default value for a polygon
let noOfIterations = 3;  // The default number of iterations is 3, as specified in the front-end of the app
let firstPoint = [];
let noPoints = 0;  // Holds the number of points that are included in the polygon
let currentColor = vec4(0.0, 0.0, 1.0, 1.0); // Default color for start is blue: #0000FF
// Keys to indicate which pattern will be drawn
const KOCH_KEY = "koch";
const FRACTAL_KEY = "fractal";
// Variable for the line color
let vColor;
// Control variables
let colorChanged = false; // Check whether the uniform lien color will be updated
let currentCurve = FRACTAL_KEY;

function render() {
    if (colorChanged) { // Update the line color via the uniform variable vColor
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4f(vColor, currentColor[0], currentColor[1], currentColor[2], currentColor[3]);
        colorChanged = false;
    }
    if (!polygonFormed) { // If polygon is not formed points will form a line strip
        if (userPos.length < 2) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.POINTS, 0, userPos.length);
        }
        if (draw) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.LINE_STRIP, 0, noPoints + 1);
        } else {
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.LINE_STRIP, 0, noPoints);
        }
    } else { // If polygon is successfully created, points will form a line loop
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.LINE_LOOP, 0, noPoints);
    }
    window.requestAnimFrame(render);
}

function saveData(data, fileName) {
    let el = document.createElement('a');
    let docData = JSON.stringify(data);
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(docData));
    el.setAttribute("download", fileName);

    el.style.display = "none";
    document.body.appendChild(el);

    el.click();

    document.body.removeChild(el);
}

function parseData(result) {
    let data = JSON.parse(result.toString());
    currentColor = data.lineColor;
    userPos = data.polygon_vertices;
    noOfIterations = data.iterCount;
    currentCurve = data.currentCurve;
    noPoints = userPos.length;
    noOfSides = userPos.length;
    polygonFormed = true;
    colorChanged = true;
}

function init() {
    // WebGL setup
    canvas = document.getElementById("koch-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL not available!");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0); // The default color of the canvas is grey

    // Connect application with shaders in main.html
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Creating buffers and binding the attribute for vertex position
    let vBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, sizeof["vec2"] * maxVertices, gl.STATIC_DRAW); // Memory allocation for vertex values, default allocation

    // Specifying the metadata for vertex positions and linking the attribute
    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition,
        2, // each element consists of two dimensions for vertices (x,y)
        gl.FLOAT, // values are in the range [-1,1] and have type float
        false,
        0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Setting the default line color - #0000FF
    vColor = gl.getUniformLocation(program, "vColor");
    gl.uniform4f(vColor, currentColor[0], currentColor[1], currentColor[2], currentColor[3]);

    // Event listener for changing the background color
    let canvasMenu = document.getElementById("canvas-select");
    canvasMenu.addEventListener("input", function () {
        let rgb = parseHexToRgb(canvasMenu.value);
        gl.clearColor(rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0, 1.0);
    });

    // Event listener for changing the line color
    let colorMenu = document.getElementById("line-select");
    colorMenu.addEventListener("input", function () {
        let rgb = parseHexToRgb(colorMenu.value);
        currentColor = vec4(rgb[0] / 255.0, rgb[1] / 255, rgb[2] / 255.0);
        colorChanged = true;
    });

    // Event listener for changing the number of iterations
    let iterMenu = document.getElementById("iter-count");
    iterMenu.addEventListener("input", function () {
        noOfIterations = parseInt(iterMenu.value);
    });

    canvas.addEventListener("mousemove", function (event) {
        if (!polygonFormed && userPos.length > 0) {  // If the polygon is not yet formed and draw operation continues
            draw = true;
            let rect = canvas.getBoundingClientRect();
            let point = [event.clientX - rect.left, event.clientY - rect.top];
            // Coordinate transformation
            let pos = vec2(2 * (point[0] / canvas.width) - 1, 2 * ((canvas.height - point[1]) / canvas.height) - 1);
            let drawPoints = Array.from(userPos);
            // Attach the temporary point that the mouse is at, then send it to vertex buffer
            drawPoints.push(pos);
            gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(drawPoints), gl.STATIC_DRAW);
        }
    });


    canvas.addEventListener("mouseup", function (event) {
        let rect = canvas.getBoundingClientRect();
        // Find the coordinates by not considering the bounding elements for the canvas
        let point = [event.clientX - rect.left, event.clientY - rect.top];
        let pos = vec2(2 * (point[0] / canvas.width) - 1, 2 * ((canvas.height - point[1]) / canvas.height) - 1);
        if (draw) {
            if (!polygonFormed) {
                // Coordinate transformation
                if (userPos.length > 0) { // Initial point is set
                    // The threshold for forming the polygon is 10 pixels distance (Manhattan distance) for each axis
                    if (Math.abs(point[0] - firstPoint[0]) < 10 && Math.abs(point[1] - firstPoint[1]) < 10) {
                        if (userPos.length >= 3) { // A polygon has at least three vertexes
                            polygonFormed = true;
                            vertices = Array.from(userPos);
                            noOfSides = userPos.length;
                            draw = false;
                        }
                    } else { // User continues to draw a polygon here
                        let idx = noPoints;
                        draw = false;
                        noPoints++;
                        userPos.push(pos);
                        gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                        gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec2'] * idx, flatten(pos));
                    }
                } else { // The user sets the first point
                    firstPoint = point;
                    noPoints++;
                    userPos.push(pos);
                    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(pos));
                }
            }
        } else {
            if (!polygonFormed) { // Will take the first point
                firstPoint = point;
                noPoints++;
                userPos.push(pos);
                gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(pos));
                draw = true;
            }
        }
    });

    let button = document.getElementById("generate-koch");
    button.addEventListener("click", function () {  // Generating a series koch snowflakes
        currentCurve = KOCH_KEY;
        if (polygonFormed) { // Generate a fractal only if there is a formed polygon
            for (let iter = 0; iter < noOfIterations; iter++) {
                let newPoints = iterateSequence(userPos, KOCH_KEY);
                noPoints = newPoints.length;
                gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                gl.bufferData(gl.ARRAY_BUFFER, flatten(newPoints), gl.STATIC_DRAW);
                userPos = newPoints;
            }
        }
    });

    let singleKoch = document.getElementById("single-koch");
    singleKoch.addEventListener("click", function () { // Generate a single Koch snowflake
        currentCurve = KOCH_KEY;
        if (polygonFormed) {  // Generate a fractal only if there is a formed polygon
            let newPoints = iterateSequence(userPos, KOCH_KEY);
            noPoints = newPoints.length;
            gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
            userPos = newPoints;
            gl.bufferData(gl.ARRAY_BUFFER, flatten(newPoints), gl.STATIC_DRAW);
        }
    });

    let singleFractal = document.getElementById("single-fractal");
    singleFractal.addEventListener("click", function () {
        currentCurve = FRACTAL_KEY;
        if (polygonFormed) {  // Generate a fractal only if there is a formed polygon
            let newPoints = iterateSequence(userPos, FRACTAL_KEY);
            noPoints = newPoints.length;
            gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
            userPos = newPoints;
            gl.bufferData(gl.ARRAY_BUFFER, flatten(newPoints), gl.STATIC_DRAW);
        }
    });

    let fractalButton = document.getElementById("generate-fractal");
    fractalButton.addEventListener("click", function () {
        currentCurve = FRACTAL_KEY;
        if (polygonFormed) {  // Generate a fractal only if there is a formed polygon
            for (let iter = 0; iter < noOfIterations; iter++) {
                let newPoints = iterateSequence(userPos, FRACTAL_KEY);
                noPoints = newPoints.length;
                gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                gl.bufferData(gl.ARRAY_BUFFER, flatten(newPoints), gl.STATIC_DRAW);
                userPos = newPoints;
            }
        }
    });

    let backgroundSelect = document.getElementById("background");
    backgroundSelect.onchange = function () { // Changing application theme
        switch(backgroundSelect.selectedIndex) {
            case 0:
                document.body.style.backgroundImage = "url('style/background-1.jpg')";
                document.getElementById("main-title").style.color = "rgb(0, 0, 0)";
                document.getElementById("koch-canvas").style.borderColor = "rgb(0, 153, 230)";
                document.body.style.color = "rgb(0, 0, 0)";
                break;
            case 1:
                document.body.style.backgroundImage = "url('style/background-2.jpg')";
                document.getElementById("main-title").style.color = "rgb(102, 204, 255)";
                document.getElementById("koch-canvas").style.borderColor = "rgb(255, 128, 0)";
                document.body.style.color = "rgb(0, 0, 0)";
                break;
            case 2:
                document.body.style.backgroundImage = "url('style/background-3.jpg')";
                document.getElementById("main-title").style.color = "rgb(255, 255, 255)";
                document.getElementById("koch-canvas").style.borderColor = "rgb(0, 0, 255)";
                document.body.style.color = "rgb(255, 255, 255)";
                break;
        }
    };

    let saveButton = document.getElementById("save-polygon");
    saveButton.addEventListener("click", function () {
        let json = {
            iterCount: noOfIterations,
            currentCurve: currentCurve,
            lineColor: currentColor,
            polygon_vertices: vertices
        };
        saveData(json, 'polygon.txt');
    });



    let loadButton = document.getElementById("load-polygon");
    loadButton.addEventListener("input", function () {
        let reader = new FileReader();
        let data = loadButton.files[0];
        reader.readAsText(data);
        reader.onload = function () {
            parseData(reader.result);
            gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(userPos), gl.STATIC_DRAW);
        };

    });

    let loadCurve = document.getElementById("load-iterate");
    loadCurve.addEventListener("input", function () {
        let reader = new FileReader();
        let data = loadCurve.files[0];
        reader.readAsText(data);
        reader.onload = function () {
            parseData(reader.result);
            for (let iter = 0; iter < noOfIterations; iter++) {
                let newPoints = iterateSequence(userPos, currentCurve);
                noPoints = newPoints.length;
                gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
                gl.bufferData(gl.ARRAY_BUFFER, flatten(newPoints), gl.STATIC_DRAW);
                userPos = newPoints;
            }
        };
    });


    render();
}


window.onload = init;

