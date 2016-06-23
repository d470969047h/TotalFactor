function Amap(map, source, wgs84Sphere) {
    this.map = map;
    this.source = source;
    this.wgs84Sphere = wgs84Sphere;

    this.draw = null;

    //measure need
    this.helpMsg = '点击开始绘制';
    this.continuePolygonMsg = '继续绘制多边形';
    this.continueLineMsg = '继续绘制折线';
}

Amap.prototype = {
    constructor: Amap,
    init: function() {

    },
    /**
     * 清理图层
     */
    clear: function() {
        this.source.clear();
        $(".tooltip").remove();
        //清除侧栏
        var myLi =   $('.sidebar-brand');
        $(".sidebar-nav > li").remove();
        $('.sidebar-nav').append(myLi);
    },
    /**
     * {
     *  drawBeforeClear: false, 绘制之前先清空图层
     *  drawMore: false,  绘制多次
     * }
     */
    drawInit: function(sets) {
        if (sets.drawBeforeClear)
            this.drawBeforeClear = true;
        if (sets.drawMore)
            this.drawMore = true;
    },
    drawFeature: function(type) {
        map.removeInteraction(this.draw);
        _this = this;
        if (this.drawBeforeClear !== undefined && this.drawBeforeClear)
            this.clear();
        if (type !== 'None') {
            var geometryFunction, maxPoints;
            if (type === 'Square') {
                type = 'Circle';
                geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
            } else if (type === 'Box') {
                type = 'LineString';
                maxPoints = 2;
                geometryFunction = function(coordinates, geometry) {
                    if (!geometry) {
                        geometry = new ol.geom.Polygon(null);
                    }

                    var start = coordinates[0];
                    var end = coordinates[1];
                    geometry.setCoordinates([
                        [start, [start[0], end[1]], end, [end[0], start[1]], start]
                    ]);
                    return geometry;
                };
            }
            this.draw = new ol.interaction.Draw({
                source: this.source,
                type: (type),
                geometryFunction: geometryFunction,
                maxPoints: maxPoints
            });
            this.draw.on("drawstart", function(evt) {
                _this.controlEvent(ol.interaction.DoubleClickZoom, false);
            });
            this.draw.on("drawend", function(evt) {
                if (_this.drawMore === undefined || !_this.drawMore)
                    map.removeInteraction(_this.draw);
                setTimeout(function() {
                    _this.controlEvent(ol.interaction.DoubleClickZoom, true);
                }, 250);
            });
            this.map.addInteraction(this.draw);
        }
    },
    /**
     * {
     *  measureBeforeClear: false, 测量之前先清空图层
     *  measureMore: false,  测量多次
     * }
     */
    measureInit: function(sets) {
        if (sets.measureBeforeClear)
            this.measureBeforeClear = true;
        if (sets.measureMore)
            this.measureMore = true;
    },
    measure: function(type) {
        _this = this;
        _this.map.removeInteraction(this.draw);
        if (this.measureBeforeClear !== undefined && this.measureBeforeClear)
            this.clear();
        var sketch, listener;
        var state = 0;
        var measures = this.createMeasureTooltip(_this.map, _this.measureTooltipElement);
        var helps = this.createHelpTooltip(_this.map, _this.helpTooltipElement);
        var pointerMoveHandler = function(evt) {
            if (evt.dragging) {
                return;
            }
            if (sketch && state != '1') {
                state = 1;
                var geom = (sketch.getGeometry());
                if (geom instanceof ol.geom.Polygon) {
                    _this.helpMsg = _this.continuePolygonMsg;
                } else if (geom instanceof ol.geom.LineString) {
                    _this.helpMsg = _this.continueLineMsg;
                }
            }
            _this.helpTooltipElement.innerHTML = _this.helpMsg;
            _this.helpTooltip.setPosition(evt.coordinate);
            _this.helpTooltipElement.classList.remove('hidden');
        };
        _this.map.on('pointermove', pointerMoveHandler);
        _this.map.getViewport().addEventListener('mouseout', function() {
            _this.helpTooltipElement.classList.add('hidden');
        });
        this.draw = new ol.interaction.Draw({
            source: _this.source,
            type: /** @type {ol.geom.GeometryType} */ (type),
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.7)'
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)'
                    })
                })
            })
        });
        _this.map.addInteraction(this.draw);
        this.draw.on('drawstart',
            function(evt) {
                sketch = evt.feature;
                var tooltipCoord = evt.coordinate;
                listener = sketch.getGeometry().on('change', function(evt) {
                    var geom = evt.target;
                    var output;
                    if (geom instanceof ol.geom.Polygon) {
                        output = _this.formatArea(geom);
                        tooltipCoord = geom.getInteriorPoint().getCoordinates();
                    } else if (geom instanceof ol.geom.LineString) {
                        output = _this.formatLength(geom);
                        tooltipCoord = geom.getLastCoordinate();
                    }
                    _this.measureTooltipElement.innerHTML = output;
                    _this.measureTooltip.setPosition(tooltipCoord);
                    _this.controlEvent(ol.interaction.DoubleClickZoom, false); //关闭双击缩进时间,避免绘制结束图层缩进
                });
            }, this);
        this.draw.on('drawend',
            function() {
                _this.measureTooltipElement.className = 'tooltip tooltip-static';
                _this.measureTooltip.setOffset([0, -7]);
                sketch = null;
                ol.Observable.unByKey(listener);
                if (_this.measureMore === undefined || !_this.measureMore){
                    _this.measureTooltipElement = null;
                    _this.helpTooltipElement.parentNode.removeChild(_this.helpTooltipElement); //清除附着框
                    _this.map.removeInteraction(_this.draw);
                }else{
                    _this.createMeasureTooltip(_this.map, _this.measureTooltipElement);
                }
                setTimeout(function() {
                    _this.controlEvent(ol.interaction.DoubleClickZoom, true);
                }, 250); //绘制结束,恢复双击缩进
            }, this);
    },
    createHelpTooltip: function() {
        if (this.helpTooltipElement) {
            $(".hidden").remove();
        }
        this.helpTooltipElement = document.createElement('div');
        this.helpTooltipElement.className = 'tooltip hidden';
        this.helpTooltip = new ol.Overlay({
            element: this.helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left'
        });
        this.map.addOverlay(this.helpTooltip);
    },
    createMeasureTooltip: function() {
        if (this.measureTooltipElement) {
            $(".tooltip-measure").remove();
        }
        this.measureTooltipElement = document.createElement('div');
        this.measureTooltipElement.className = 'tooltip tooltip-measure';
        this.measureTooltip = new ol.Overlay({
            element: this.measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center'
        });
        this.map.addOverlay(this.measureTooltip);
    },
    formatLength: function(line){
        var length;
        if (1) {
            var coordinates = line.getCoordinates();
            length = 0;
            var sourceProj = this.map.getView().getProjection();
            for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
                var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
                var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
                length += this.wgs84Sphere.haversineDistance(c1, c2);
            }
        } else {
            length = Math.round(line.getLength() * 100) / 100;
        }
        var output;
        if (length > 100) {
            output = (Math.round(length / 1000 * 100) / 100) +
                ' ' + 'km';
        } else {
            output = (Math.round(length * 100) / 100) +
                ' ' + 'm';
        }
        return output;
    },
    formatArea: function(polygon){
        var area;
        if (1) {
            var sourceProj = this.map.getView().getProjection();
            var geom = /** @type {ol.geom.Polygon} */ (polygon.clone().transform(
                sourceProj, 'EPSG:4326'));
            var coordinates = geom.getLinearRing(0).getCoordinates();
            area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates));
        } else {
            area = polygon.getArea();
        }
        var output;
        if (area > 10000) {
            output = (Math.round(area / 1000000 * 100) / 100) +
                ' ' + 'km<sup>2</sup>';
        } else {
            output = (Math.round(area * 100) / 100) +
                ' ' + 'm<sup>2</sup>';
        }
        return output;
    },
    controlEvent: function(event, active){
        var interactions = this.map.getInteractions();
        for (var i = 0; i < interactions.getLength(); i++) {
            var interaction = interactions.item(i);
            if (interaction instanceof event) {
                interaction.setActive(active);
            }
        }
    },




//+++++++++++++++++++++++++++++++++++++++++
//+++++++++++++++++++++++++++++++++++++++++
//根据选择类型
showModel:function (modelType) {
   $.ajax({
       url:'data/detailData.json',
       type:'POST',
       dataType:'json',
       success :function (data) {
          var myLi = ""
           $.each(data,function(n,value) {
              if(value.modelType==modelType){
                getPoints(value,modelType,'');
                myLi += '<li style="cursor:pointer;"><a onclick="javascript:goDetail('+value.lon+','+value.lat+',\'red\');">'+value.name+'</a></li>';
              }
           });
          $('.sidebar-nav').append(myLi);
          if($('.sidebar-nav').children('li').length > 1){
            $("#wrapper").removeClass("toggled");
          }
       },
       error:function (data) {
            alert('未请求到数据！');
       }
   });
}


};
