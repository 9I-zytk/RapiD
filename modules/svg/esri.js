import * as d3 from 'd3';
import _ from 'lodash';
import { geoExtent, geoPolygonIntersectsPolygon } from '../geo/index';
import { osmEntity, osmNode, osmRelation, osmWay } from '../osm/index';
import { utilDetect } from '../util/detect';
import toGeoJSON from 'togeojson';
import fromEsri from 'esri-to-geojson';

export function svgEsri(projection, context, dispatch) {
    var showLabels = true,
        detected = utilDetect(),
        layer;


    function init() {
        if (svgEsri.initialized) return;  // run once

        svgEsri.geojson = {};
        svgEsri.enabled = true;

        function over() {
            d3.event.stopPropagation();
            d3.event.preventDefault();
            d3.event.dataTransfer.dropEffect = 'copy';
        }

        d3.select('body')
            .attr('dropzone', 'copy')
            .on('drop.localesri', function() {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                if (!detected.filedrop) return;
                drawEsri.files(d3.event.dataTransfer.files);
            })
            .on('dragenter.localesri', over)
            .on('dragexit.localesri', over)
            .on('dragover.localesri', over);

        svgEsri.initialized = true;
    }


    function drawEsri(selection) {
        var geojson = svgEsri.geojson,
            enabled = svgEsri.enabled;

        layer = selection.selectAll('.layer-esri')
            .data(enabled ? [0] : []);

        layer.exit()
            .remove();

        layer = layer.enter()
            .append('g')
            .attr('class', 'layer-esri')
            .merge(layer);


        var paths = layer
            .selectAll('path')
            .data(geojson.features || []);

        paths.exit()
            .remove();
        
        var entities = [];

        paths = paths.enter()
            .append('path')
            .attr('class', function(d) {
                // console.log(d);
                if (d.geometry.type === 'Point') {
                    entities.push(new osmNode({
                         id: 'esri_node_' + d.properties.OBJECTID,
                         loc: d.geometry.coordinates,
                         version: 1, // attrs.version.value,
                         user: 'mapmeld', // attrs.user && attrs.user.value,
                         tags: d.properties, // getTags(obj),
                         visible: true // getVisible(attrs)
                     }));
                } else if (d.geometry.type === 'LineString') {
                    var nodes = [];
                    var pts = d.geometry.coordinates;
                    for (var p = 0; p < pts.length; p++) {
                        var mininode_id = 'n' + ln + '' + p + '000' + d.properties.OBJECTID;
                        nodes.push(mininode_id);
                        entities.push(new osmNode({
                            id: mininode_id,
                            loc: pts[p],
                            version: 1,
                            user: 'mapmeld',
                            tags: {},
                            visible: true
                        }));
                    }
                    entities.push(new osmWay({
                        id: 'esri_way_' + d.properties.OBJECTID,
			    		version: 1,
					    user: 'mapmeld',
					    tags: d.properties,
					    nodes: nodes,
					    visible: true
					}));
				} else if (d.geometry.type === 'MultiLineString') {
				    for (var ln = 0; ln < d.geometry.coordinates.length; ln++) {
                        var nodes = [];
                        var pts = d.geometry.coordinates[ln];
                        for (var p = 0; p < pts.length; p++) {
                            var mininode_id = 'n' + ln + '' + p + '000' + d.properties.OBJECTID;
                            nodes.push(mininode_id);
                            entities.push(new osmNode({
                                id: mininode_id,
                                loc: pts[p],
                                version: 1,
                                user: 'mapmeld',
                                tags: {},
                                visible: true
                            }));
                        }
                        entities.push(new osmWay({
                            id: 'esri_way_' + ln + '_' + d.properties.OBJECTID,
			        		version: 1,
			    		    user: 'mapmeld',
				    	    tags: d.properties,
			    		    nodes: nodes,
					        visible: true
					    }));
					}
				} else if (d.geometry.type === 'Polygon') {
				    d.properties.area = d.properties.area || 'yes';
                    var nodes = [];
                    var pts = d.geometry.coordinates[0];
                    for (var p = 0; p < pts.length; p++) {
                        var mininode_id = 'n' + p + '000' + d.properties.OBJECTID;
                        nodes.push(mininode_id);
                        entities.push(new osmNode({
                            id: mininode_id,
                            loc: pts[p],
                            version: 1,
                            user: 'mapmeld',
                            tags: {},
                            visible: true
                        }));
                    }
                    entities.push(new osmWay({
                        id: 'esri_way_' + d.properties.OBJECTID,
		    			version: 1,
			    		user: 'mapmeld',
				    	tags: d.properties,
					    nodes: nodes,
					    visible: true
					}));
                } else if (d.geometry.type === 'MultiPolygon') {
                    d.properties.area = d.properties.area || 'yes';
				    for (var ln = 0; ln < d.geometry.coordinates.length; ln++) {
                        var nodes = [];
                        var pts = d.geometry.coordinates[ln][0];
                        for (var p = 0; p < pts.length; p++) {
                            var mininode_id = 'n' + ln + '' + p + '000' + d.properties.OBJECTID;
                            nodes.push(mininode_id);
                            entities.push(new osmNode({
                                id: mininode_id,
                                loc: pts[p],
                                version: 1,
                                user: 'mapmeld',
                                tags: {},
                                visible: true
                            }));
                        }
                        entities.push(new osmWay({
                            id: 'esri_way_' + ln + '_' + d.properties.OBJECTID,
			        		version: 1,
			    		    user: 'mapmeld',
				    	    tags: d.properties,
			    		    nodes: nodes,
					        visible: true
					    }));
					}
				}
            })
            .merge(paths);
        
        if (entities.length) {
            context.entitiesLoaded(null, {
                data: entities,
                extent: context.map().trimmedExtent()
            });
        }
        
        return this;
    }


    drawEsri.showLabels = function(_) {
        if (!arguments.length) return showLabels;
        showLabels = _;
        return this;
    };


    drawEsri.enabled = function(_) {
        if (!arguments.length) return svgEsri.enabled;
        svgEsri.enabled = _;
        dispatch.call('change');
        return this;
    };


    drawEsri.hasData = function() {
        var geojson = svgEsri.geojson;
        return (!(_.isEmpty(geojson) || _.isEmpty(geojson.features)));
    };


    drawEsri.geojson = function(gj) {
        if (!arguments.length) return svgEsri.geojson;
        if (_.isEmpty(gj) || _.isEmpty(gj.features)) return this;
        svgEsri.geojson = gj;
        dispatch.call('change');
        return this;
    };


    drawEsri.url = function(true_url) {
        var url = true_url;
        if (url.indexOf('outSR') === -1) {
            url += '&outSR=4326';
        }
        if (url.indexOf('&f=') === -1) {
            url += '&f=json';
        }        
        
        var bounds = context.map().trimmedExtent().bbox();
        var bounds = JSON.stringify({
            xmin: bounds.minX.toFixed(6),
			ymin: bounds.minY.toFixed(6),
			xmax: bounds.maxX.toFixed(6),
			ymax: bounds.maxY.toFixed(6),
			spatialReference: {
			  wkid: 4326
		    }
		});
		if (this.lastBounds === bounds) {
		    // unchanged
		    return this;
		}
		this.lastBounds = bounds;
		
		if (url.indexOf('spatialRel') === -1) {
		    // don't overwrite a spatial query
            url += '&geometry=' + this.lastBounds;
            url += '&geometryType=esriGeometryEnvelope';
            url += '&spatialRel=esriSpatialRelIntersects';
            url += '&inSR=4326';
        }
        
        d3.text(url, function(err, data) {
            if (err) {
                console.log('Esri service URL did not load');
                console.error(err);
            } else {
                drawEsri.geojson(fromEsri.fromEsri(JSON.parse(data)));
            }
        });
        
        context.map().on('move', function() {
            if (this.timeout) {
               clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(function() {
                this.url(true_url);
            }.bind(this), 500);
        }.bind(this));
        
        return this;
    };

    drawEsri.fitZoom = function() {
        if (!this.hasData()) return this;
        var geojson = svgEsri.geojson;

        var map = context.map(),
            viewport = map.trimmedExtent().polygon(),
            coords = _.reduce(geojson.features, function(coords, feature) {
                var c = feature.geometry.coordinates;
                return _.union(coords, feature.geometry.type === 'Point' ? [c] : c);
            }, []);

        if (!geoPolygonIntersectsPolygon(viewport, coords, true)) {
            var extent = geoExtent(d3.geoBounds(geojson));
            map.centerZoom(extent.center(), map.trimmedExtentZoom(extent));
        }

        return this;
    };


    init();
    return drawEsri;
}
