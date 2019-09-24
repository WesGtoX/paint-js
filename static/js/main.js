// Reference to the canvas element
let canvas
// Context provides functions used for drawing and 
// working with Canvas
let ctx
// Stores previously drawn image data to restore after
// new drawings are added
let savedImageData
// Stores whether I'm currently dragging the mouse
let dragging = false
// Stores the current color of the boxes in the stroke and color variables
let getStrokeColor = document.getElementById('strokeColor')
let getFillColor = document.getElementById('fillColor')
let strokeColor = getStrokeColor.value
let fillColor = getFillColor.value
let line_Width = 2
let polygonSides = 6
// Get the state of checkbox to change or not, if the draw will be filled
let getFillState = document.getElementById('fillState')
let fillState = getFillState.checked
//Tool currently using
let currentTool = 'brush'
let canvasWidth = 1024
let canvasHeight = 600
let starSpikes = 5

// Stores whether I'm currently using brush
let usingBrush = false
// Stores line x & ys used to make brush lines
let brushXPoints = new Array()
let brushYPoints = new Array()
// Stores whether mouse is down
let brushDownPos = new Array()
// Erase state
let erasing = false
// Store X e Y points and when mouse is down
let eraseXPoints = new Array()
let eraseYPoints = new Array()
let eraseDownPos = new Array()
let cPushArray = new Array()
let cStep = -1


// Stores size data used to create rubber band shapes
// that will redraw as the user moves the mouse
class ShapeBoundingBox {
    constructor(left, top, width, height) {
        this.left = left
        this.top = top
        this.width = width
        this.height = height
    }
}

// Holds x & y position where clicked
class MouseDownPos {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

// Holds x & y location of the mouse
class Location {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

// Holds x & y polygon point values
class PolygonPoint {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

// Stores top left x & y and size of rubber band box 
let shapeBoundingBox = new ShapeBoundingBox(0, 0, 0, 0)
// Holds x & y position where clicked
let mousedown = new MouseDownPos(0, 0)
// Holds x & y location of the mouse
let loc = new Location(0,0)
 
// Call for our function to execute when page is loaded
document.addEventListener('DOMContentLoaded', setupCanvas)

function setupCanvas() {
    // Get reference to canvas element
    canvas = document.getElementById('my-canvas')
    // Get methods for manipulating the canvas
    ctx = canvas.getContext('2d')
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = fillColor
    ctx.lineWidth = line_Width
    // Execute ReactToMouseDown when the mouse is clicked
    canvas.addEventListener("mousedown", ReactToMouseDown)
    // Execute ReactToMouseMove when the mouse is clicked
    canvas.addEventListener("mousemove", ReactToMouseMove)
    // Execute ReactToMouseUp when the mouse is clicked
    canvas.addEventListener("mouseup", ReactToMouseUp)
}

function ChangeTool(toolClicked) {
    document.getElementById("open").className = ""
    document.getElementById("save").className = ""
    document.getElementById('eraser').className = ""
    document.getElementById("brush").className = ""
    document.getElementById("line").className = ""
    document.getElementById('curve').className = ""
    document.getElementById('letterL').className = ""
    document.getElementById('letterW').className = ""
    document.getElementById('car').className = ""
    document.getElementById('house').className = ""
    document.getElementById("rectangle").className = ""
    document.getElementById("circle").className = ""
    document.getElementById("ellipse").className = ""
    document.getElementById("hexagon").className = ""
    document.getElementById("arrow").className = ""
    document.getElementById("triangle").className = ""
    document.getElementById("pentagon").className = ""
    document.getElementById("diamond").className = ""
    document.getElementById('fourStar').className = ""
    document.getElementById('fiveStar').className = ""

    // Highlight the last selected tool on toolbar
    document.getElementById(toolClicked).className = "selected"
    // Change current tool used for drawing
    currentTool = toolClicked
}

// Returns mouse x & y position based on canvas position in page
function GetMousePosition(x, y) {
    // Get canvas size and position in web page
    let canvasSizeData = canvas.getBoundingClientRect()
    return {
        x: (x - canvasSizeData.left) * (canvas.width / canvasSizeData.width),
        y: (y - canvasSizeData.top) * (canvas.height / canvasSizeData.height)
    }
}

// Save canvas image
function SaveCanvasImage() {
    // Save image
    savedImageData = ctx.getImageData(0,0,canvas.width,canvas.height)
}

// Redraw canvas image
function RedrawCanvasImage() {
    // restore image
    ctx.putImageData(savedImageData, 0, 0)
}

// Update rubberband size data
function UpdateRubberbandSizeData(loc) {
    // Height & width are the difference between were clicked
    // and current mouse position
    shapeBoundingBox.width = Math.abs(loc.x - mousedown.x)
    shapeBoundingBox.height = Math.abs(loc.y - mousedown.y)
    
    // If mouse is below where mouse was clicked originally
    if(loc.x > mousedown.x) {
        // Store mousedown because it is farthest left
        shapeBoundingBox.left = mousedown.x
    } else {
        // Store mouse location because it is most left
        shapeBoundingBox.left = loc.x
    }
    // If mouse location is below where clicked originally
    if(loc.y > mousedown.y) {
        // Store mousedown because it is closer to the top of the canvas
        shapeBoundingBox.top = mousedown.y
    } else {
        // Otherwise store mouse position
        shapeBoundingBox.top = loc.y
    }
}

// Returns the angle using x and y
// x = Adjacent Side
// y = Opposite Side
// Tan(Angle) = Opposite / Adjacent
// Angle = ArcTan(Opposite / Adjacent)
function getAngleUsingXAndY(mouselocX, mouselocY) {
    let adjacent = mousedown.x - mouselocX
    let opposite = mousedown.y - mouselocY
    return radiansToDegress(Math.atan2(opposite, adjacent))
}

// Radians to degrees
function radiansToDegress(rad) {
    if (rad < 0) {
        // Correct the botton error by adding the negative angle 
        // to 360 to get the correct result around the whole circle
        return (360.0 + (rad * (180 / Math.PI))).toFixed(2)
    } else {
        return (rad * (180 / Math.PI)).toFixed(2)
    }
}

// Convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180)
}

function getPolygonPoints() {
    // Get angle in radians based on x & y of mouse location
    let angle =  degreesToRadians(getAngleUsingXAndY(loc.x, loc.y))

    // X & Y for the X & Y point representing the radius is equal to
    // the X & Y of the bounding rubberband box
    let radiusX = shapeBoundingBox.width
    let radiusY = shapeBoundingBox.height
    // Stores all points in the polygon
    let polygonPoints = []

    // Each point in the polygon is found by breaking the 
    // parts of the polygon into triangles
    // Then I can use the known angle and adjacent side length
    // to find the X = mouseLoc.x + radiusX * Sin(angle)
    // You find the Y = mouseLoc.y + radiusY * Cos(angle)
    for(let i = 0; i < polygonSides; i++) {
        polygonPoints.push(new PolygonPoint(loc.x + radiusX * Math.sin(angle),
        loc.y - radiusY * Math.cos(angle)))

        // 2 * PI equals 360 degrees
        // Divide 360 into parts based on how many polygon 
        // sides you want 
        angle += 2 * Math.PI / polygonSides
    }
    return polygonPoints
}

// Get the polygon points and draw the polygon
function getPolygon() {
    let polygonPoints = getPolygonPoints()
    ctx.beginPath()
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y)
    for (let i = 1; i < polygonSides; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y)
    }
    ctx.closePath()

    if (fillState == true){
        ctx.stroke();
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

// Draw rubberband shape
function drawRubberbandShape(loc) {
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = fillColor

    if (currentTool === "brush") {
        // Create paint brush
        DrawBrush()
    } else if (currentTool === "line") {
        // Draw Line
        ctx.strokeStyle = strokeColor
        ctx.beginPath()
        ctx.moveTo(mousedown.x, mousedown.y)
        ctx.lineTo(loc.x, loc.y)
        ctx.stroke()
    } else if (currentTool === "rectangle") {
        // Creates rectangles
        if (fillState == true){
            ctx.strokeRect(shapeBoundingBox.left, shapeBoundingBox.top,
                shapeBoundingBox.width, shapeBoundingBox.height)
            ctx.fillRect(shapeBoundingBox.left, shapeBoundingBox.top,
                shapeBoundingBox.width, shapeBoundingBox.height)
        } else {
            ctx.strokeRect(shapeBoundingBox.left, shapeBoundingBox.top,
              shapeBoundingBox.width, shapeBoundingBox.height)
        }
    } else if (currentTool === "circle") {
        // Create circles
        let radius = shapeBoundingBox.width
        ctx.beginPath()
        ctx.arc(mousedown.x, mousedown.y, radius, 0, Math.PI * 2)
        
        if(fillState == true){
            ctx.stroke()
            ctx.fill();
        } else {
            ctx.stroke();
        }
    } else if (currentTool === "ellipse") {
        // Create ellipses
        // ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
        let radiusX = shapeBoundingBox.width / 2
        let radiusY = shapeBoundingBox.height / 2
        ctx.beginPath()
        ctx.ellipse(mousedown.x, mousedown.y, radiusX, radiusY, Math.PI / 4, 0, Math.PI * 2)
        
        if (fillState == true){
            ctx.stroke()
            ctx.fill();
        } else {
            ctx.stroke();
        }
    } else if (currentTool === "hexagon") {
        // Create hexagons
        polygonSides = 6
        getPolygon()
        ctx.stroke()
    } else if (currentTool === "arrow") {
        // Create arrows
        ctx.beginPath()
        GetArrow(mousedown.x, mousedown.y, loc.x, loc.y)
        ctx.stroke()
    } else if (currentTool === "triangle"){
        // Create triangles
        polygonSides = 3
        getPolygon()
        ctx.stroke()
    } else if (currentTool === "diamond"){
        // Create diamond
        drawDiamond(loc.x, loc.y, shapeBoundingBox.width, shapeBoundingBox.height)
    } else if (currentTool === "pentagon"){
        // Create pentagons
        polygonSides = 5
        getPolygon()
        ctx.stroke()
    } else if (currentTool === "curve") {
        // Create a bezier curve
        BezierCurve(loc.x, loc.y)
    } else if (currentTool === "fourStar") {
        // Create a star with four spikes
        starSpikes = 4
        drawStar(mousedown.x, mousedown.y, starSpikes, loc.x - mousedown.x, loc.y - mousedown.y)
    } else if (currentTool === "fiveStar") {
        // Create a star with five spikes
        starSpikes = 5
        drawStar(mousedown.x, mousedown.y, starSpikes, loc.x - mousedown.x, loc.y - mousedown.y)
    } else if (currentTool === "letterL"){
        DrawL(loc.x)
    } else if (currentTool === "letterW"){
        DrawW(loc.x)
    }
}

// Update rubberband on move
function UpdateRubberbandOnMove(loc) {
    // Stores changing height, width, x & y position of most 
    // top left point being either the click or mouse location
    UpdateRubberbandSizeData(loc)

    // Redraw the shape
    drawRubberbandShape(loc)
}

// Store each point as the mouse moves and whether the mouse
// button is currently being dragged
function AddBrushPoint(x, y, mouseDown) {
    brushXPoints.push(x)
    brushYPoints.push(y)
    // Store true that mouse is down
    brushDownPos.push(mouseDown)
}

function AddErasePoint(x, y, mouseDown) {
    eraseXPoints.push(x)
    eraseYPoints.push(y)
    // Store true that mouse is down
    eraseDownPos.push(mouseDown)
}

// Cycle through all brush points and connect them with lines
function DrawBrush() {
    for (let i = 1; i < brushXPoints.length; i++) {
        ctx.beginPath()

        // Check if the mouse button was down at this point
        // and if so continue drawing
        if (brushDownPos[i]) {
            ctx.moveTo(brushXPoints[i-1], brushYPoints[i-1])
        } else {
            ctx.moveTo(brushXPoints[i]-1, brushYPoints[i])
        }
        ctx.lineTo(brushXPoints[i], brushYPoints[i])
        ctx.closePath()
        ctx.stroke()
    }
}

function EraseDraw() {
    for (let i = 1; i < eraseXPoints.length; i++) {
        ctx.beginPath()

        // Check if the mouse button was down at this point
        // and if so continue drawing
        if (eraseDownPos[i]) {
            ctx.moveTo(eraseXPoints[i-1], eraseYPoints[i-1])
        } else {
            ctx.moveTo(eraseXPoints[i]-1, eraseYPoints[i])
        }
        ctx.lineTo(eraseXPoints[i], eraseYPoints[i])
        ctx.closePath()
        ctx.clearRect(mousedown.x, mousedown.y, 30, 30)
    }
}

// ReactToMouseDown
function ReactToMouseDown(e) {
    // Change the mouse pointer to a crosshair
    canvas.style.cursor = "crosshair"
    // Store location 
    loc = GetMousePosition(e.clientX, e.clientY)
    // Save the current canvas image
    SaveCanvasImage()
    // Store mouse position when clicked
    mousedown.x = loc.x
    mousedown.y = loc.y
    // Store that yes the mouse is being held down
    dragging = true

    // Brush will store points in an array
    if (currentTool === 'brush') {
        usingBrush = true
        AddBrushPoint(loc.x, loc.y)
    } else if (currentTool === 'eraser'){
        erasing = true
        AddErasePoint(loc.x, loc.y)
    }
}

// ReactToMouseMove
function ReactToMouseMove(e) {
    canvas.style.cursor = "crosshair"
    loc = GetMousePosition(e.clientX, e.clientY)

    // If using brush tool and dragging store each point
    if (currentTool === 'brush' && dragging && usingBrush) {
        // Throw away brush drawings that occur outside of the canvas
        if (loc.x > 0 && loc.x < canvasWidth && loc.y > 0 && loc.y < canvasHeight) {
            AddBrushPoint(loc.x, loc.y, true)
        }
        RedrawCanvasImage()
        DrawBrush()
    } else {
        if (dragging) {
            RedrawCanvasImage()
            UpdateRubberbandOnMove(loc)
        }
    }
}

// ReactToMouseUp
function ReactToMouseUp(e) {
    canvas.style.cursor = "default"
    loc = GetMousePosition(e.clientX, e.clientY)
    RedrawCanvasImage()
    UpdateRubberbandOnMove(loc)
    dragging = false
    usingBrush = false
}

// Not working
function DrawL(x){
    ctx.font = `${x - mousedown.x}px times new roman`
    if(fillState == true){
        ctx.strokeText('L', mousedown.x, mousedown.y)    
        ctx.fillText('L', mousedown.x, mousedown.y)
    }else{
        ctx.strokeText('L', mousedown.x, mousedown.y)
    }
}

function DrawW(x){
    ctx.font = `${x - mousedown.x}px arial black`
    if(fillState == true){
        ctx.strokeText('W', mousedown.x, mousedown.y)    
        ctx.fillText('W', mousedown.x, mousedown.y)
    }else{
        ctx.strokeText('W', mousedown.x, mousedown.y)
    }
}

function GetArrow(fromx, fromy, tox, toy) {
    var headlen = 10; // length of head in pixels
    var dx = tox - fromx;
    var dy = toy - fromy;
    var angle = Math.atan2(dy, dx);
    // Create arrow
    ctx.beginPath()
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke()
}

function BezierCurve(x, y){
    ctx.beginPath()
    ctx.moveTo(mousedown.x, mousedown.y)
    ctx.bezierCurveTo(mousedown.x, x - mousedown.x, x, y - mousedown.y, y, mousedown.y)
    ctx.stroke()
}

function drawDiamond(x, y, width, height){
    ctx.beginPath();
    ctx.moveTo(x, y);        
    // top left edge
    ctx.lineTo(x - width / 2, y + height / 2);
    // bottom left edge
    ctx.lineTo(x, y + height);
    // bottom right edge
    ctx.lineTo(x + width / 2, y + height / 2);
    // closing the path automatically creates
    // the top right edge
    ctx.closePath();
    if(fillState == true){
        ctx.fill();
    }else{
        ctx.stroke();
    }
    ctx.restore();
}

function rotation(){
}

function scale(){
}

function drawStar(cx,cy,spikes,outerRadius,innerRadius){
    var rot=Math.PI/2*3;
    var x=cx;
    var y=cy;
    var step=Math.PI/spikes;

    ctx.beginPath();
    ctx.moveTo(cx,cy-outerRadius)
    for(i=0;i<spikes;i++){
      x=cx+Math.cos(rot)*outerRadius;
      y=cy+Math.sin(rot)*outerRadius;
      ctx.lineTo(x,y)
      rot+=step

      x=cx+Math.cos(rot)*innerRadius;
      y=cy+Math.sin(rot)*innerRadius;
      ctx.lineTo(x,y)
      rot+=step
    }
    ctx.lineTo(cx,cy-outerRadius);
    ctx.closePath();
    if(fillState == true){
        ctx.fill();
    }else{
        ctx.stroke();
    }
}

function drawHouse(){
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = fillColor

    // Draw a triangle for the roof
    ctx.beginPath();
    ctx.moveTo(100,260);
    ctx.lineTo(300,10);
    ctx.lineTo(500,260);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // chimney
    ctx.fillRect(381, 60, 45, 120);
    ctx.strokeRect(381, 60, 45, 140);
    ctx.ellipse(380, 55, 47, 14, 0.78539, 0, 6.283);
    ctx.strokeRect(378, 198, 55, 5);
    // house walls
    //ctx.fillRect(100, 260, 400, 300);
    ctx.strokeRect(100, 260, 400, 300);
    // windows
    ctx.fillRect(130, 300, 70, 45);
    ctx.fillRect(205, 300, 70, 45);
    ctx.fillRect(325, 300, 70, 45);
    ctx.fillRect(400, 300, 70, 45);
    ctx.fillRect(130, 350, 70, 45);
    ctx.fillRect(205, 350, 70, 45);
    ctx.fillRect(325, 350, 70, 45);
    ctx.fillRect(400, 350, 70, 45);
    ctx.fillRect(325, 425, 70, 45);
    ctx.fillRect(400, 425, 70, 45);
    ctx.fillRect(325, 475, 70, 45);
    ctx.fillRect(400, 475, 70, 45);
    // door lines
    ctx.beginPath();
    ctx.restore();
    ctx.moveTo(200, 423);
    ctx.lineTo(200, 560);
    ctx.moveTo(140,433);
    ctx.lineTo(140, 560);
    ctx.moveTo(260,434);
    ctx.lineTo(260, 560);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(199,562,140,1.355*Math.PI,1.65*Math.PI); // door arc
    ctx.stroke();
    // door handles
    ctx.beginPath();
    ctx.arc(185,510,5,0,2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(215,510,5,0,2*Math.PI);
    ctx.stroke();
}

function drawCar(){
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = fillColor

    //body
    ctx.beginPath();
    ctx.moveTo(25, 150);
	ctx.bezierCurveTo(50, 130, 60, 120, 70, 120);
	ctx.moveTo(70, 120);
	ctx.lineTo(120, 120);
	ctx.bezierCurveTo(140, 130, 130, 125, 160, 150);
	ctx.quadraticCurveTo(190,160,190,180);
	ctx.lineTo(5, 180);
	ctx.quadraticCurveTo(5,150,25, 150);
	ctx.closePath();
 
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(5, 180, 185,7);
    ctx.stroke();
 
	// WINDOW
	ctx.beginPath();
	ctx.moveTo(75, 125);
	ctx.lineTo(115, 125);
	ctx.lineTo(130, 150);
	ctx.lineTo(60, 150);
	ctx.closePath();
 
	ctx.moveTo(56, 125);
	ctx.lineTo(72, 125);
	ctx.lineTo(55, 150);
	ctx.lineTo(25, 150);
	ctx.closePath();
 
	// WHEELS
	ctx.beginPath();
    ctx.arc(50, 180, 15,0, 2 * Math.PI, true);
    ctx.fill()
    ctx.stroke();
 
    ctx.beginPath();
    ctx.arc(140, 180, 15,0, 2 * Math.PI, true);
    ctx.fill()
    ctx.stroke();
}

// Set the new state of the checkbox
function setFillState(){
    fillState = getFillState.checked
}

function clearCanvas(){
    ctx.clearRect(0, 0, canvasHeight, canvasWidth)
}

// Define the new stroke and fill color when the color inputs are changed
function setStrokeFillColor(){
    strokeColor = getStrokeColor.value
    fillColor = getFillColor.value
}


// Saves the image in your default download directory
function SaveImage() {
    // Get a reference to the link element 
    let imageFile = document.getElementById("img-file")
    // Set that you want to download the image when link is clicked
    imageFile.setAttribute('download', 'image.png')
    // Reference the image in canvas for download
    imageFile.setAttribute('href', canvas.toDataURL())
}

// Open image
function OpenImage() {
    let img = new Image()
    // Once the image is loaded clear the canvas and draw it
    img.src = 'image.png'
    img.onload = function() {  
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
    }
}
