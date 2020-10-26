/**
 * Converts a hexadecimal RGB encoding to color intensity values ranging [0,255]
 * Uses the color channels Red, Green and Blue
 * @param hexColor: Hexadecimal encoding of the desired color value, starts with '#' symbol
 * @returns {number[]}: Array that consists color intensity values for 3 color channels, intensity values have type float
 */
function parseHexToRgb(hexColor) {
    let color = hexColor.slice(1);
    return [parseFloat(parseInt("0x" + color.slice(0,2)).toFixed(1)),
        parseFloat(parseInt("0x" + color.slice(2,4)).toFixed(1)),
        parseFloat(parseInt("0x" + color.slice(4,6)).toFixed(1))];
}

/**
 * Gives the rotation matrix for rotating a point by 'rotationAngle' in radians,
 * to the positive direction in the coordinate axis
 * @param rotationAngle: The angle to rotate the point, in radians
 * @returns {*[]}: Rotation matrix that the dot product with the vector gives the rotated vector
 */
function getRotationMatrix(rotationAngle) {
    let cos = Math.cos(rotationAngle);
    let sin = Math.sin(rotationAngle);
    return [
        vec2(cos, - sin),
        vec2(sin, cos)
    ];
}

/**
 * Gets the point and an angle to rotate(in radians) and rotates that point
 * @param radian: Angle to rotate the vector, in radians
 * @param point: Vector to rotate by angle 'radian'
 * @returns {*}: Returns the rotated vector, a 2D vector
 */
function rotatePoint(radian, point) {
    let matrix = getRotationMatrix(radian);
    return vec2(matrix[0][0] * point[0] + matrix[0][1] * point[1],
        matrix[1][0] * point[0] + matrix[1][1] * point[1]);
}

/**
 * Generates the points for the fractal
 * @param startVertex: Starting point of the line segment
 * @param endVertex: Ending point of the line segment
 * @returns {[*, []]}:
 */
function generateFractalPoints(startVertex, endVertex) {
    let lineVector = scale(1/4, subtract(endVertex, startVertex));
    let midPoint = mix(startVertex, endVertex, 0.5);
    let firstQuart = mix(startVertex, midPoint, 0.5);
    let secondQuart = mix(midPoint, endVertex, 0.5);
    let fractalPoints = [startVertex, firstQuart];
    let verticalVector = rotatePoint(radians(90), lineVector);
    let point = add(vec2(firstQuart), verticalVector);
    fractalPoints.push(point);
    point = add(point, lineVector);
    fractalPoints.push(point);
    point = vec2(midPoint);
    fractalPoints.push(point);
    point = subtract(point, verticalVector);
    fractalPoints.push(point);
    point = add(point, lineVector);
    fractalPoints.push(point);
    fractalPoints.push(secondQuart);
    fractalPoints.push(endVertex);
    return fractalPoints;
}

/**
 * Generates the resulting points for an iteration of koch curve
 * for a line specified by its starting point and ending point
 * @param startVertex: coordinates of the starting point of the vertex - has type vec2
 * @param endVertex: coordinates of the ending point of the vertex - has type vec2
 * @param sideCount: Number of sides of the convex shape that the rule is being applied on
 */
function generateKochPoints(startVertex, endVertex, sideCount) {
    let kochPoints = [];
    kochPoints.push(startVertex);
    let exteriorAngle = 360 / sideCount;
    let midPoint = mix(startVertex, endVertex, 0.5);
    let lineVector = subtract(endVertex, startVertex);
    let startPoint = subtract(midPoint, scale(1/(2 * sideCount), lineVector));
    let endPoint = add(midPoint, scale(1/(2 * sideCount), lineVector));
    let rotation = true;
    lineVector = scale(1/sideCount, lineVector);
    let lastPoint = startPoint;
    kochPoints.push(lastPoint);
    for (let vertexNo = 0; vertexNo < sideCount - 2; vertexNo++) {
        let angle;
        // theta is the interior angle of the polygon here
        if (!rotation) { // Rotate (180 - theta) angles to right (negative side)
            angle = radians(360 - (exteriorAngle));
        } else { // Rotate theta degrees to left (positive side)
            angle = radians(180 - exteriorAngle);
            rotation = !rotation;
        }
        let matrix = getRotationMatrix(angle);
        // Dot Product
        lineVector =
            vec2(matrix[0][0] * lineVector[0] + matrix[0][1] * lineVector[1],
                matrix[1][0] * lineVector[0] + matrix[1][1] * lineVector[1]);
        lastPoint = add(lastPoint, lineVector);
        kochPoints.push(lastPoint);
    }
    kochPoints.push(endPoint);
    kochPoints.push(endVertex);
    return kochPoints;
}

function iterateSequence(vertexSrc, fractalType) {
    let newPoints = [];
    for (let i = 0; i < vertexSrc.length; i++) {
        let fractalPts;
        if (i == vertexSrc.length - 1) {
            if (fractalType == "koch") {
                fractalPts = generateKochPoints(vertexSrc[i], vertexSrc[0], noOfSides);
            } else {
                fractalPts = generateFractalPoints(vertexSrc[i], vertexSrc[0]);
            }
        }
        else { if (fractalType == "koch") {
            fractalPts = generateKochPoints(vertexSrc[i], vertexSrc[i + 1], noOfSides);
        } else {
            fractalPts = generateFractalPoints(vertexSrc[i], vertexSrc[i + 1]);
        } }
        newPoints = newPoints.concat(fractalPts);
    }
    return newPoints;
}