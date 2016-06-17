/**
 * 点击标记弹出框  ---------------------开始---------------------------
 * @type {ol.Coordinate}
 */
var container =$('#popup')[0];
var content = $('#popup-content')[0];
var closer = $('#popup-closer')[0];
//弹出层
var overlay = new ol.Overlay(({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250//显示时间
    }
}));
closer.onclick = function() {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};
/**
 *  点击标记弹出框   ------------------结束-------------------------
 * @type {ol.Coordinate}
 */

var home = [12959133.77546878,4858490.391862372];//北京
// var home = ol.proj.transform([116.41490936279297,39.957618713378906], 'EPSG:4326', 'EPSG:3857');
//来放置图标
var sourceFeatures = new ol.source.Vector(),
    layerFeatures = new ol.layer.Vector({
        source: sourceFeatures
    });

var lineString = new ol.geom.LineString([]);
var layerRoute = new ol.layer.Vector({
    source: new ol.source.Vector({
        features: [
            new ol.Feature({ geometry: lineString })
        ]
    }),
    style: [
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                width: 3,
                color: [40, 40, 40, 1],
                lineDash: [.1, 5]
            }),
            zIndex: 2
        })
    ],
    updateWhileAnimating: true
});

var localLayer = new ol.layer.Tile({
    source:new ol.source.XYZ({
        url:' http://localhost:8888/roadmap/{z}/{x}/{y}.png'
    }),
    opacity: .8
});
var localView =  new ol.View({
    /*projection: 'EPSG:3857',*/
    maxZoom: 19,
    minZoom:5,
    center: home,
    zoom: 9
});
//控件
var someControls = ol.control.defaults().extend([
/*            new ol.control.FullScreen(),//全屏控件
        new ol.control.OverviewMap(),//缩略图控件*/
    new ol.control.MousePosition(),//鼠标位置控件
    new ol.control.ScaleLine(),//比例尺控件
    new ol.control.ZoomSlider(),//缩放滚动条控件
    new ol.control.Attribution(),//地图属性控件
    new ol.control.ZoomToExtent()//缩放到范围控件
]);

var map = new ol.Map({
    logo: false,
    target: 'map',
    loadTilesWhileAnimating: true,
    loadTilesWhileInteracting: true,
    view: localView,
    renderer: 'canvas',
    layers: [localLayer,layerRoute, layerFeatures],
    overlays:[overlay],
    controls:someControls
});

 /***********************方法区****************************/
//+++++++++++++++++++++++++++画点++++++++++++++++++++
function getPoints(node) {
     var point = ol.proj.transform([Number(node.lon),Number(node.lat)], 'EPSG:4326', 'EPSG:3857');
     // 创建一个Feature，并设置好在地图上anchor的位置
     var feature = new ol.Feature({
         geometry: new ol.geom.Point(point)
     });
     feature.setProperties({
         id:node.guid,
         name:node.name,
         lon:node.lon,
         lat:node.lat
     });
     //将“点”的样式设置为图片
     var pointStyle = new ol.style.Style({
         image:new ol.style.Icon({
             src:'images/icon.png',
             anchor: [0.5,1]
         })
     });
     //设置样式，应用上面的样式
     feature.setStyle(pointStyle);
     //添加到之前的创建的layer中
     layerFeatures.getSource().addFeature(feature);

}

//    map.on('singleclick', function (event) {
//         var coordinate = event.coordinate;
//         layer.getSource().addFeature(new ol.Feature({geometry: new ol.geom.Point(map.getCoordinateFromPixel(event.pixel))}));
// //        alert(ol.proj.transform(coordinate,'EPSG:3857','EPSG:4326'));
//        $.messager.alert("坐标",coordinate);
// //        alert(coordinate);
//     });

//+++++++++++++++++++路径+++++++++++++++++++
var markerEl = document.getElementById('geo-marker');
var marker = new ol.Overlay({
    positioning: 'center-center',
    offset: [0, 0],
    element: markerEl,
    stopEvent: false
});
map.addOverlay(marker);

var fill = new ol.style.Fill({color:[255,255,255,1]}),
    stroke = new ol.style.Stroke({color:[0,0,0,1]}),
    style_parada = [
        new ol.style.Style({
            image: new ol.style.Icon({
                scale: .7, opacity: 1,
                rotateWithView: false, anchor: [0.5, 1],
                anchorXUnits: 'fraction', anchorYUnits: 'fraction',
                src: 'images/marker.png'
            }), zIndex: 5
        }),
        new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6, fill: fill, stroke: stroke
            }), zIndex: 4
        })
    ];

window.onload = function(){
    loadAnimation();
};
function createFeature(data){
    var feature, hint_address, hint_address_overlay;

    data.forEach(function(row){

        feature = new ol.Feature({
            desc: row.desc,
            geometry: new ol.geom.Point(row.lonlat)
        });
        feature.setStyle(style_parada);
        sourceFeatures.addFeature(feature);

        hint_address = document.createElement('div');
        hint_address.className = 'hint-address hint--always hint--left';
        //hint_address.setAttribute('data-hint', row.endereco);

        hint_address_overlay = new ol.Overlay({
            element: hint_address,
            offset: [-5, -5],
            position: row.lonlat,
            positioning: 'bottom-left'
        });
        map.addOverlay(hint_address_overlay);

    });
}
var coords, intervalId, interval = 1000,//移动速度
 i = 0;
function loadAnimation(){
    reqwest({
        url: 'data/route/route.json',
        type: 'json'
    }).then(function (resp) {
        //console.info(resp[1].rota);
        coords = resp[1].rota;
        coords.map(function(row){
            lineString.appendCoordinate(row[0]);
        });
        createFeature(resp);
        intervalId = setInterval(animate, interval);
    }).fail(function (err, msg) {
        console.info(err, msg);
    });
}

function animate(){
    marker.setPosition(coords[i][0]);
    //markerEl.setAttribute('data-hint', coords[i][1] + ' Km');
    i++;
    if(i == coords.length){
        i = 0;
    }
}
// ++++++++++++++++++监听地图点击事件++++++++++++++
map.on('singleclick', function(event){
    var feature = map.forEachFeatureAtPixel(event.pixel, function(feature){
        return feature;
    });
    if (feature) {
      //  jQuery.support.cors = true;//跨域
        var node=feature.getProperties();
        var str ='';
        var name = '';
        $.ajax({
            url:'data/data.json',
            dataType:'json',
            method:'POST',
            success :function (data) {
                var coordinate = event.coordinate;
                var guid = "";
                $.each(data,function(n,info1) {
                    if(info1.pid==node.id){
                      guid = info1.pid;
                        name = feature.getProperties().name;
                        $.each(info1.property,function (m, info2) {
                            str+=info2.name+": "+info2.value+"<br>"
                        })
                    }
                });
                if (guid!="") {//避免绘制时出现详情信息
                  content.innerHTML = '<p><code style="color: #0000FF;font-size: 14px;">'+name+'</code>详细信息:</p><code style="padding: 2px 0">' + str + '</code>';
                  overlay.setPosition(coordinate);
                }
            },
            error:function (data) {
                alert('没请求');
            }
        });
    }
});







//-++++++++++++++其他方法+++++++++++++++++++
$(function () {
   $.ajax({
       url:'data/detailData.json',
       type:'POST',
       dataType:'json',
       success :function (data) {
           $.each(data,function(n,value) {
               getPoints(value);
           });
       },
       error:function (data) {
            alert('未请求到数据！');
       }
   });
});



/*************创建绘制按钮********************/
var wgs84Sphere = new ol.Sphere(6378137);
// 在viewport节点下添加一个分享按钮
var viewport = map.getViewport();
var html = '<div class="btn-group toolbar" style="top:30px;" role="group" aria-label="...">';
html += '<button type="button" class="btn btn-default btn-sm" onclick="amap.clear()">清屏</button>';
// html += '<button type="button" class="btn btn-default btn-sm">影像</button>';
// html += '<button type="button" class="btn btn-default btn-sm">三维</button>';
// html += '<button type="button" class="btn btn-default btn-sm">图层</button>';
html += '<div class="btn-group" role="group">';
html += '<button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
html += '工具 ';
html += '<span class="caret"></span>';
html += '</button>';
html += '<ul class="dropdown-menu">';
html += '<li><a href="javascript:;" onclick="amap.drawFeature(\'Point\')">点</a></li>';
html += '<li><a href="javascript:;" onclick="amap.drawFeature(\'LineString\')">线</a></li>';
html += '<li><a href="javascript:;" onclick="amap.drawFeature(\'Polygon\')">面</a></li>';
html += '<li><a href="javascript:;" onclick="amap.measure(\'LineString\');">距离</a></li>';
html += '<li><a href="javascript:;" onclick="amap.measure(\'Polygon\');">面积</a></li>';
html += '</ul>';
html += '</div>';
html += '</div>';
$(viewport).append(html);

amap = new Amap(map, sourceFeatures, wgs84Sphere);



/*    $('.ol-zoom-in, .ol-zoom-out').tooltip({
        placement: 'right'
    });
    $('.ol-rotate-reset, .ol-attribution button[title]').tooltip({
        placement: 'left'
    });*/
