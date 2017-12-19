var map;
var infowindow;
var myLatLng;
var directionsDisplay;
var directionsService;
var cityCircle;
var count;
var prevPoint;
var placeService;
var sampleData;
var selectedCoords;
var markers_arr = [];
var $radius = $('#radius');
var $subType = $('#subtype_select');

// get current location
function locate() {
    navigator.geolocation.getCurrentPosition(initialize,fail);
}

// call when failed to get Current Location
function fail() {
    alert('Failed to get your Location.');
    var defaultPosition = {
        coords: {
            latitude: 10.3193294,
            longitude: 123.903832
        }
    };
    initialize(defaultPosition);
}

// initialize all
function initialize(position) {
    $('#floating-panel').show();
    var radius = parseInt($radius.val());
    var type = 'restaurant';
    var json = $.getJSON( "assets/json/map_style.json");
    var restaurantJSON = $.getJSON( "assets/json/restaurants.json");
    myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    count = 0;
    directionsDisplay = new google.maps.DirectionsRenderer;
    directionsService = new google.maps.DirectionsService();
    infowindow = new google.maps.InfoWindow();

    $('.radius').text(radius);

    json.done(function(map_style) {
        // set map options  
        var mapOptions = {
            zoom: radiusToZoom(radius),
            center: myLatLng,
            styles: map_style
        }
        // initialize map
        map = new google.maps.Map(document.getElementById('map'), mapOptions);
        // add click listener for map for drawing circles
        map.addListener('click', function(event) {    
            drawCircle(event.latLng, parseInt($radius.val()));    
        });
        
        // set map for directions
        directionsDisplay.setMap(map);
        // set panel for directions
        directionsDisplay.setPanel(document.getElementById('right-panel'));
        // draw self marker
        drawSelfMarker(myLatLng);
        // display all restaurants
        displayRestaurantJSON(restaurantJSON);
    });
}

// add change event for when radius is changed
$radius.on('change', function () {
    drawCircle(selectedCoords, parseInt($radius.val()));
});

// add change event when restaurant type is changed
$subType.on('change', function () {
    clearRoutes();
    filterRestaurants($(this).val());
});

// add change event when travel mode is changed
$('input[name=travel_mode]').on('change', function () {
    if(prevPoint)
        calculateRoute(myLatLng, prevPoint);
});

// display sample data restautants
function displayRestaurantJSON (restaurantJSON) {
    restaurantJSON.done(function(results) {
        if(results.length > 0) {
            sampleData = results;
            populateTypeOption(sampleData);
            filterRestaurants($subType.find(":selected").val());
        }
    });
}

// draw marker of current location
function drawSelfMarker () {
    //set marker
    var userMarker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        animation: google.maps.Animation.BOUNCE,
        title: "You are here!"
    });

    // draw circle within current location
    drawCircle(myLatLng, parseInt($radius.val()));

    // add info window when self marker is clicked
    userMarker.addListener('click', function() {
        this.setAnimation(null);
        infowindow.setContent("You are here!");
        infowindow.open(map, this);
    });
}

//draws a circle when user clicks the map
function drawCircle(point, radius) {
    removeCircle();
    selectedCoords = point;
    // set Circle
    cityCircle = new google.maps.Circle({
        strokeOpacity: 0.8,
        strokeWeight: 1,
        strokeColor: '#3498db',
        fillOpacity: 0.35,
        fillColor: '#3498db',
        map: map,
        center: point,
        radius: radius,
        cursor: "hand"
    });

    // update count 
    if(sampleData) {
        filterRestaurants($subType.find(":selected").val());
    }
}

// compute zoom value base on radius
function radiusToZoom(radius){
    radius *= 0.00035;
    return Math.round(14-Math.log(radius)/Math.LN2);
}

//get Default icon for restaurants
function getIcon() {
    //set default icon for restaurants
	var icon = {
        url: "assets/images/pin.svg", //url
        scaledSize: new google.maps.Size(50, 50), // scaled size
        origin: new google.maps.Point(0,0), // origin
        anchor: new google.maps.Point(20,40), // anchors
    }

    return icon;
}

// create marker and marker events
function createMarker(place) {
    // get place location
    var placeLoc = place.geometry.location;

    //get icon
    var icon = getIcon();
    
    //set marker
    var marker = new google.maps.Marker({
        map: map,
        title: place.name,
        animation: null,
        position: placeLoc,
        icon: icon,
    });

    // add click event for marker
    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(setMarkerContent(place, this.getPosition()));
        infowindow.open(map, this);
        bounceMarker(this);
    });

    // add right click event for marker
    google.maps.event.addListener(marker, "rightclick", function() {
        infowindow.setContent(setMarkerContent(place, this.getPosition()));
        infowindow.open(map, this);
        bounceMarker(this);
    });

    // save markers for easy clearing
    markers_arr.push(marker);
}

// set marker info window
function setMarkerContent (place, position) {
    var result = '<div id="content">' +
            '<h3 id="name">' +
                '<b>'+place.name+'</b>' +
            '</h3>' +
            '<p><b>Address: </b> ' +
                place.vicinity + 
            '</p>'+
            "<a href='#' onclick='getDirections("+
                position.lat() +
                ", "+
                position.lng() +
            ")' id='directions'>Get Directions</a><hr>"+
            '<p><b>Type:</b> ' +
                place.type + 
            '</p>'+
            '<p><b>Specialty: </b> ' +
                place.specialty + 
            '</p>'+
            '<p><b>Visited Customers: </b> ' +
                place.customers + 
            '</p>'+
            '<p><b>Ratings: </b> ' +
                place.rating + 
            '</p>'+
        '</div>';
    return result;
}

// get directions to marker 
function getDirections (lat, lng) {
    prevPoint = {lat: lat, lng: lng};
    calculateRoute(myLatLng, prevPoint);
}

// calculate route
function calculateRoute(start, end) {
    directionsDisplay.setMap(map);
    directionsService.route({
        origin: start,
        destination: end,
        travelMode: $('input[name=travel_mode]:checked').val(),
    }, function(response, status) {
        if (status === 'OK') {
        directionsDisplay.setDirections(response);
        } else {
        alert('Directions request failed due to ' + status);
        }
    });
}

// filter restaurants
function filterRestaurants(type) {
	removeMarkers();
	count = 0;
	// loop through all sample data
	for (var i = 0; i < sampleData.length; i++) {
		// get restaurants matching the selected type
		if(sampleData[i].type == type || type == '') {
            createMarker(sampleData[i]);
            getCountInRadius(sampleData[i]);
            
		}
    }
    updateCountDisplay(count);
}

// get count within radius 
function getCountInRadius (place) {
    if(selectedCoords) {
        var markerCoords = new google.maps.LatLng(place.geometry.location.lat, place.geometry.location.lng);
        var diff = (google.maps.geometry.spherical.computeDistanceBetween(markerCoords, selectedCoords));
        if(diff <= $radius.val()) {
            count++;
        }
    }
}

// update count display
function updateCountDisplay(count) {
    text_count = count + " restaurant";
    if(count > 1)
        text_count += "s";
    $('#count').text(text_count);
}

//clears current route if there is a route.
function clearRoutes() {
    if (directionsDisplay != null) {
        // empty html content for directions
        $('#right-panel').html('');
        // set previous point to null
        prevPoint = null;
        directionsDisplay.setMap(null);
    }
}

// remove circle, if there is a circle
function removeCircle() {
	if(cityCircle != undefined) {
    	cityCircle.setMap(null);
    }
}

// remove markers in the map
function removeMarkers() {
	if(markers_arr.length > 0) {
    	for(var i = 0; i < markers_arr.length; i++) {
		   markers_arr[i].setMap(null);
		}
	}
}

// returns all unique values
function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

// populates options for restaurant types
function populateTypeOption (sampleData) {
    var options = '<option value=""> All </option>';
    var type = [];
    if(sampleData.length > 1) {
        for(var i = 0; i < sampleData.length; i++) {
            if(sampleData[i].type)
                type.push(sampleData[i].type);
        }
    }

    $.each( type.filter( onlyUnique ), function( key, value ) {
        options += '<option value="'+ value + '"> ' + value + '</option>';
    });
    $subType.html(options);
}

// unbounces other marker and toggle bounce clicked marker
var prevClickedMarker;
function bounceMarker(clicked) {
    if(prevClickedMarker)
        prevClickedMarker.setAnimation(null);

    if (clicked.getAnimation() !== null) {
          clicked.setAnimation(null);
    } else {
        clicked.setAnimation(google.maps.Animation.BOUNCE);
    }

    prevClickedMarker = clicked;
}

$(document).ready(function () {
    locate();
    $("#floating-panel").draggable({
        cursor: 'move'
    });
});