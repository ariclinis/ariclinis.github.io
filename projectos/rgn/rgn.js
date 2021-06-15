/*     Rede Geodésica Nacional

Aluno 1: 54699 Ariclene Chimbili <-- mandatory to fill
Aluno 2: 55796 Goncalo Malheiro <-- mandatory to fill

Implementamos todas as funcoes excepto a que remove os circulos dos VGS quando  clicamos 
no mapa, por isso tem que atualizar a pagina sempre que realizar uma operacão, sorry ):

Comentario:

O ficheiro "rng.js" tem de incluir, logo nas primeiras linhas,
um comentário inicial contendo: o nome e número dos dois alunos que
realizaram o projeto; indicação de quais as partes do trabalho que
foram feitas e das que não foram feitas (para facilitar uma correção
sem enganos); ainda possivelmente alertando para alguns aspetos da
implementação que possam ser menos óbvios para o avaliador.

0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference-1.7.1.html
*/



/* GLOBAL CONSTANTS */

const MAP_CENTRE =
	[38.661,-9.2044];  // FCT coordinates
const MAP_ID =
	"mapid";
const MAP_ATTRIBUTION =
	'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
	+ 'contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
const MAP_URL =
	'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token='
	+ 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
const MAP_ERROR =
	"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";
const MAP_LAYERS =
	["streets-v11", "outdoors-v11", "light-v10", "dark-v10", "satellite-v9",
		"satellite-streets-v11", "navigation-day-v1", "navigation-night-v1"]
const RESOURCES_DIR =
	"resources/";
const VG_ORDERS =
	["order1", "order2", "order3", "order4"];
const RGN_FILE_NAME =
	"rgn.xml";


/* GLOBAL VARIABLES */

let map = null;
let nOrdem3=0;


/* USEFUL FUNCTIONS */

// Capitalize the first letter of a string.
function capitalize(str)
{
	return str.length > 0
			? str[0].toUpperCase() + str.slice(1)
			: str;
}

// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2)
{
    function toRad(deg) { return deg * 3.1415926535898 / 180.0; }
    let dLat = toRad(lat2 - lat1), dLon = toRad (lon2 - lon1);
    let sa = Math.sin(dLat / 2.0), so = Math.sin(dLon / 2.0);
    let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
    return 6372.8 * 2.0 * Math.asin (Math.sqrt(a))
}

function loadXMLDoc(filename)
{
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	}
	catch(err) {
		alert("Could not access the local geocaching database via AJAX.\n"
			+ "Therefore, no POIs will be visible.\n");
	}
	return xhttp.responseXML;	
}

function getAllValuesByTagName(xml, name)  {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name)  {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}


/* POI */

class VG {
	constructor(xml) {
		this.name = getFirstValueByTagName(xml, "name");
		this.latitude = getFirstValueByTagName(xml, "latitude");
		this.longitude = getFirstValueByTagName(xml, "longitude");
		this.order = getFirstValueByTagName(xml, "order");
		this.altitude = getFirstValueByTagName(xml, "altitude");
		this.type = getFirstValueByTagName(xml, "type");
		this.mark = null;
		this.map = null;
		this.circle=null;
		this.visible = true;
	}
	addMark(mark,map){
		this.mark = mark;
		this.map = map;
	}
	isVisible(){
		return this.visible;
	}
	isCircled(){
		return this.circle != null;
	}
	changVisible() {
		if (this.visible) {
			this.mark.remove(this.map);
			this.visible=false;
		}else{
			this.mark.addTo(this.map);
			this.visible = true;
		}
	}
	changeCircle(){
		this.circle = null;
	}
	setCircle(c){ 
		this.circle = c;
	}
	getCicle(){
		return this.circle;
	}
	removeCircle(){
		this.circle=null;
	}
	isValidToCompareNear_60(){
		return false;
	}
	isValidToCompareNear_30(){
		return false;
	}
}

class VG1 extends VG{
	constructor(xml) {
		super(xml);
		this.vgs = [];
		this.numVgs = 0;
	}
	
	add_vg_proximos_de_60m(vg){
		this.vgs[this.numVgs] = vg;
		this.numVgs++;
	}
	vg_proximos_60m(){
		return this.vgs;
	}
	isValidToCompareNear_60(){
		return true;
	}
}

class VG2 extends VG{
	constructor(xml) {
		super(xml);
		this.vgs = [];
		this.numVgs = 0;
	}
	add_vg_proximos_de_30m(vg){
		this.vgs[this.numVgs] = vg;
		this.numVgs++;
	}
	vg_proximos_30m(){
		return this.vgs;
	}
	isValidToCompareNear_30(){
		return true;
	}
}

class VG3 extends VG{
	
}
class VG4 extends VG{
	
}


/* MAP */

class Map {
	
	constructor(center, zoom) {
		this.lmap = L.map(MAP_ID).setView(center, zoom);
		this.addBaseLayers(MAP_LAYERS);
		let icons = this.loadIcons(RESOURCES_DIR);
		this.VGMaisElevado;
		this.VGMenosElevad;
		this.countVG=[0,0,0,0];
		this.visibleVG=[true,true,true,true];
		this.TotalVisible=0;
		this.vgs = this.loadRGN(RESOURCES_DIR + RGN_FILE_NAME);
		this.populate(icons, this.vgs);
		this.addClickHandler(e =>
			L.popup()
			.setLatLng(e.latlng)
			.setContent("You clicked the map at " + e.latlng.toString())
		);
		this.TotalVisible=this.countVG[0]+this.countVG[1]+this.countVG[2]+this.countVG[3];
		
	}
	getVGs(){
		return this.vgs;
	}
	getIndex(nome){
		for (let index = 0; index < this.vgs.length; index++) {
			
			if(nome ==this.vgs[index]){
				return index;
			}
		}
		return -1;
	}
	getTotalVisible(){
		return this.TotalVisible;
	}
	getVGMaisElevado(){
		return this.VGMaisElevado;
	}
	getVGMenosElevado(){
		return this.VGMenosElevad;
	}
	getTotalByOrder(order){
		return this.countVG[order-1];
	}

	makeMapLayer(name, spec) {
		let urlTemplate = MAP_URL;
		let attr = MAP_ATTRIBUTION;
		let errorTileUrl = MAP_ERROR;
		let layer =
			L.tileLayer(urlTemplate, {
					minZoom: 6,
					maxZoom: 19,
					errorTileUrl: errorTileUrl,
					id: spec,
					tileSize: 512,
					zoomOffset: -1,
					attribution: attr
			});
		return layer;
	}

	addBaseLayers(specs) {
		let baseMaps = [];
		for(let i in specs)
			baseMaps[capitalize(specs[i])] =
				this.makeMapLayer(specs[i], "mapbox/" + specs[i]);
		baseMaps[capitalize(specs[0])].addTo(this.lmap);
		L.control.scale({maxWidth: 150, metric: true, imperial: false})
									.setPosition("topleft").addTo(this.lmap);
		L.control.layers(baseMaps, {}).setPosition("topleft").addTo(this.lmap);
		return baseMaps;
	}

	loadIcons(dir) {
		let icons = [];
		let iconOptions = {
			iconUrl: "??",
			shadowUrl: "??",
			iconSize: [16, 16],
			shadowSize: [16, 16],
			iconAnchor: [8, 8],
			shadowAnchor: [8, 8],
			popupAnchor: [0, -6] // offset the determines where the popup should open
		};
		for(let i = 0 ; i < VG_ORDERS.length ; i++) {
			iconOptions.iconUrl = dir + VG_ORDERS[i] + ".png";
		    icons[VG_ORDERS[i]] = L.icon(iconOptions);
		}
		return icons;
	}

	loadRGN(filename) {
		let xmlDoc = loadXMLDoc(filename);
		let xs = getAllValuesByTagName(xmlDoc, "vg"); 
		let vgs = [];
		if(xs.length == 0)
			alert("Empty file");
		else {
			this.VGMaisElevado = new VG(xs[0]);
			this.VGMenosElevad = new VG(xs[0]);
			
			for(let i = 0 ; i < xs.length ; i++){
				switch(parseInt(xs[i].getElementsByTagName("order")[0].childNodes[0].nodeValue)){
					case 1:
						vgs[i] = new VG1(xs[i]);
						this.countVG[0]++;
						for (let index =0;index < vgs.length; index++) {
							if(i!=index && vgs[index].isValidToCompareNear_60()){
								let distance = haversine(vgs[i].latitude,vgs[i].longitude,vgs[index].latitude, vgs[index].longitude)
								if(distance<=60){
									vgs[i].add_vg_proximos_de_60m(vgs[index]);
									vgs[index].add_vg_proximos_de_60m(vgs[i]);
								}
							}
						}
					break;
					case 2:
						vgs[i] = new VG2(xs[i]);
						this.countVG[1]++;
						for (let index =0;index < vgs.length; index++) {
							if(i!=index && vgs[index].isValidToCompareNear_30()){
								let distance = haversine(vgs[i].latitude,vgs[i].longitude,vgs[index].latitude, vgs[index].longitude)
								if(distance<=60){
									vgs[i].add_vg_proximos_de_30m(vgs[index]);
									vgs[index].add_vg_proximos_de_30m(vgs[i]);
								}
							}
						}
					break;
					case 3:
						vgs[i] = new VG3(xs[i]);
						this.countVG[2]++;
					break;
					case 4:
						vgs[i] = new VG4(xs[i]);
						this.countVG[3]++;
					break;
				}
				if(this.VGMaisElevado.altitude<=vgs[i].altitude){
					this.VGMaisElevado=vgs[i];
				}
				if(this.VGMenosElevad.altitude>=vgs[i].altitude){
					this.VGMaisElevado=vgs[i];
				}
				
			}
		}
		return vgs;
	}

	populate(icons, vgs)  {
		for(let i = 0 ; i < vgs.length ; i++)
			this.addMarker(icons, vgs[i]);
	}

	addMarker(icons, vg) {

		let marker = L.marker([vg.latitude, vg.longitude], {icon: icons['order'+vg.order]});
		let index = this.getIndex(vg);
		let btt = '<input type="button" class="btn btn-info" value="Selecionar VGs Proximos de 30 km" onclick="putCicleIn('+index+')" />';
		marker
			.bindPopup("VG <b>" + vg.name + "</b>."
			+"<p>"+(vg.isValidToCompareNear_60()?'<b>Tem </b>'+vg.vg_proximos_60m().length+' <b>VGs Proximos,a mais ou menos 60 km:</b>':'')+"</p>"
			+"<p>"+(vg.isValidToCompareNear_30()?btt:[])+"</p>"
			+"<p></p><input type='button' class='btn btn-info' value='Selecionar Todos Deste Tipo' onclick='addCircloDeOrder("+vg.order+")' />"
			+"<p></p><a target='_blank' href='http://maps.google.com/maps?q=&layer=c&cbll="+vg.latitude+","+vg.longitude+"'>ver google map</a>")
				.bindTooltip("Nome: "+vg.name
				+"<p> Latitude: "+vg.latitude
				+"</p> <p>Longitude: "+vg.longitude
				+"</p> <p>Ordem: "+vg.order
				+"</p> <p> Altitude: "+vg.altitude
				+"</p> <p> Tipo: "+vg.type+"</p>"
				)
					.addTo(this.lmap);
		vg.addMark(marker,this.lmap);
	}

	addClickHandler(handler) {
		let m = this.lmap;
		function handler2(e) {
			return handler(e).openOn(m);
		}
		return this.lmap.on('click', handler2);
	}

	addCircle(pos, radius, popup) {
		let circle =
			L.circle(pos,
				radius,
				{color: 'red', fillColor: 'pink', fillOpacity: 0.4}
			);
		circle.addTo(this.lmap);
		if( popup != "" )
			circle.bindPopup(popup);
		return circle;
	}

	changeVisibleOrder(order){
		for(let i = 0 ; i < this.vgs.length ; i++){
			if(this.vgs[i].order == order){
				this.vgs[i].changVisible();
			}
		}
	}

	changTotalVisible(order){
		if(this.visibleVG[order-1]){
			this.visibleVG[order-1]=false;
			this.TotalVisible = this.TotalVisible - this.countVG[order-1];
		}else{
			this.visibleVG[order-1]=true;
			this.TotalVisible = this.TotalVisible + this.countVG[order-1];
		}
	}
	removeCirculos(){
		let vgs = map.getVGs();
		
		for (let i = 0; i < vgs.length; i++) {
			if(vgs[i].getCicle()!=null){
				vgs[i].getCicle().remove(this.lmap)
				vgs[i].removeCircle();
				
			}
		}
		
	}
	
	getVGsInvalidos(){
		let vgs=[];
		let index=0;
		for(let i = 0 ; i < this.vgs.length ; i++){
			let vg = this.vgs[i];
			let found = false;
			let i2 = 0;
			while ( i2 < this.vgs.length && !found) {
				let vg_aux = this.vgs[i2] ;
				if(i!=i2 && vg_aux.order==vg.order){
					let distance = haversine(vg.latitude,vg.longitude,vg_aux.latitude,vg_aux.longitude);
					switch(parseInt(vg.order)){
						case 1:
							if(distance>=30.0 && distance<=60.0){
								found=true;
							}
						break;
						case 2:
							if(distance>=20.0 && distance<=30.0){
								found=true;
							}
						break;
						case 3:
							if(distance>=5.0 && distance<=10.0){
								found=true;
							}
						break;
						case 4:
								found=true;
						break;
					}
				}
				i2++;
			}
			if(!found){
				vgs[index]=vg;
				index++;
			}
		}
		return vgs;
	}
	

	putCicleVGsOrder(order){
		let vgs = this.getVGs();
		let aux ;
		for (let i = 0; i < vgs.length; i++) {
			aux=vgs[i];
			if(vgs[i].order == order){
				let l= [vgs[i].latitude,vgs[i].longitude];
				let c= this.addCircle(l, 200, vgs[i].name);
				//aux.circle = c;
			}else{
				aux.removeCircle();
			}
			
		}
	}

	
}


/* FUNCTIONS for HTML */

function onLoad()
{
	map = new Map(MAP_CENTRE, 12);
	map.addCircle(MAP_CENTRE, 100, "FCT/UNL");
	document.getElementById("visible_caches").innerHTML = map.getTotalVisible();
	document.getElementById("vgs1").innerHTML = map.getTotalByOrder(1);
	document.getElementById("vgs2").innerHTML = map.getTotalByOrder(2);
	document.getElementById("vgs3").innerHTML = map.getTotalByOrder(3);
	document.getElementById("vgs4").innerHTML = map.getTotalByOrder(4);
	document.getElementById("vg_mais_elevado").innerHTML = map.getVGMaisElevado().name;
	document.getElementById("vg_menos_elevado").innerHTML = map.getVGMenosElevado().name;

	
}

function clasterVGs(){
	var markers = L.markerClusterGroup();
	var vgs= map.getVGs();
	var modo = document.getElementById("claster").value;
	console.log(modo);
	if(modo == "Ativar Clustering"){
		for (var i = 0; i < vgs.length; i++) {
			var a = vgs[i];
			var title = a.name;
			var marker = L.marker(new L.LatLng(a.latitude, a.longitude), { title: title });
			marker.bindPopup(title);
			markers.addLayer(marker);
		}	
		map.lmap.addLayer(markers);
		document.getElementById("claster").value= "Desativar Clustering";
		document.getElementById("vgs1").checked = true;
		document.getElementById("vgs2").checked = true;
		document.getElementById("vgs3").checked = true;
		document.getElementById("vgs4").checked = true;
	}else{
		
		location.reload(); 
	}
	
	map.changeVisibleOrder(1);
	map.changeVisibleOrder(2);
	map.changeVisibleOrder(3);
	map.changeVisibleOrder(4);
}
function checkboxUpdate1(){
	map.changeVisibleOrder(1);
	map.changTotalVisible(1);
	document.getElementById("visible_caches").innerHTML = map.getTotalVisible();
}
function checkboxUpdate2(){
	map.changeVisibleOrder(2);
	map.changTotalVisible(2);
	document.getElementById("visible_caches").innerHTML = map.getTotalVisible();
}

function checkboxUpdate3(){
	map.changeVisibleOrder(3);
	map.changTotalVisible(3);
	document.getElementById("visible_caches").innerHTML = map.getTotalVisible();
}

function checkboxUpdate4(){
	map.changeVisibleOrder(4);
	map.changTotalVisible(4);
	document.getElementById("visible_caches").innerHTML = map.getTotalVisible();
}

function validarVGs(){
	let texto = "";
	let vgs_invalidos = map.getVGsInvalidos();
	for (let i = 0; i < vgs_invalidos.length; i++) {
		texto += "\n"+vgs_invalidos[i].name+" ordem "+vgs_invalidos[i].order;
	}
	alert("Lista de VGS Invalidos:"+texto);
}

function putCicleIn(index) {



	let vgs = map.getVGs();
	vgs = vgs[index].vg_proximos_30m();
	for (let i = 0; i < vgs.length; i++) {
		if(vgs[i].isVisible() && !vgs[i].isCircled()){
			let l = [parseFloat(vgs[i].latitude),parseFloat(vgs[i].longitude)];
			c = map.addCircle(l, 300, vgs[i].name);
			//vgs[i].changeCircle();
		}
	}
}

function putCicleVGs(){
	let vgs = map.getVGs();
	let raio=250;
	for (let i = 0; i < vgs.length; i++) {
		if(vgs[i].isVisible() && !vgs[i].isCircled()){
			raio = vgs[i].altitude;
			if(raio<=100 || raio =="ND"){
				raio = 200;
			}else{
				raio = raio*3;
			}
			l=[vgs[i].latitude,vgs[i].longitude];
			map.addCircle(l, raio, vgs[i].name);
		}
	}	
}


function removeCirculos() {
	//map.removeCirculos();
}

function addCircloDeOrder(order) {
	map.putCicleVGsOrder(order);
}

