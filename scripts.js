
clientId = "GIS_POAS_VYSOTKA_";

function point(id, x, y){
    this.id = id;
    this.x = x;
    this.y = y;
}

function waySegment(p1, p2){
    this.p1 = p1;
    this.p2 = p2;
}
adminMode = new Vue ({
    el : "#gis-client",
    data : {
        serveraddr : "",
        isLogged : false,
        user : {
            password : "",
            login : ""
        },
        isActive : false,
        existPoints : [],
        existWaySegments : [],
        pointToAdd : null,
        streetName : "",
        pointToLink1 : null,
        pointToLink2 : null,
        tools : Object.freeze({NONE : 0, ADD_POINT : 1, LINK_POINTS : 2}),
        curTool : 0,
        canv : null,
        newLinkCanv : null
    },
    
    methods : {
        addExistPoint: function(point){
            this.existPoints.push(point);
        },
        addExistWaySegment: function(waySegment){
            this.existWaySegments.push(waySegment);
        },
        setTool: function( tool){
            this.curTool = tool;
        },
        login : function (){
            var t = this;
            let login = t.user.login;
            let password =t.user.password;
            let method = "Authorization";
        
            $.get(serverAddr, 
            {
                method : method,
                password : password,
                login : login
            }, 
            function (data)
            {
                data = JSON.parse(data);
                let isAuth = data.isAuth;
                if ( isAuth === true ){
                    t.isLogged = true;
                    localStorage.setItem(clientId+"login", t.user.login);
                    localStorage.setItem(clientId+"password", t.user.password);
                    localStorage.setItem(clientId+"isLogged", t.isLogged);
                    $('#myModal').modal('hide');
                } else {
                    t.isLogged = false;
                    alert("Кажется, у вас ошибочка");
                }
            })
        },
        logout : function(){
            this.isLogged = false;
            localStorage.setItem(clientId+"login", null);
            localStorage.setItem(clientId+"password", null);
        },
        startEdit : function (){
            this.isActive = true;
            this.setTool( this.tools.NONE);
        },
        endEdit: function(){
            this.isActive = false;
        },
        toogleEdit : function(){
            if ( this.isActive){
                this.endEdit();
            } else {
                this.startEdit();
            }
        },
        setNewPoint : function( event){
            if ( this.curTool === this.tools.ADD_POINT){
                let x = event.offsetX;
                let y = event.offsetY;
                this.pointToAdd = new point(-1, x,y);
            }
        },
        chooseLinkPoint : function( point){
            event.stopPropagation()
            
            if ( point === this.pointToLink1){
                this.pointToLink1 = null;
            } else if ( point === this.pointToLink2){
                this.pointToLink2 = null;
            } else if (this.curTool === this.tools.ADD_POINT){
                this.pointToLink1 = point;
            } else if ( this.curTool === this.tools.LINK_POINTS){
                if ( this.pointToLink1 === null){
                    this.pointToLink1 = point;
                } else {
                    this.pointToLink2 = point;
                }
            }
        },
        drawNewSegment : function(){
            
            this.newLinkCanv = $("#map-admin-new-link-canvas")[0].getContext("2d");
            this.newLinkCanv.strokeStyle = "red";
            this.newLinkCanv.lineWidth = 5;
            
            this.newLinkCanv.clearRect(0, 0, this.newLinkCanv.canvas.width, this.newLinkCanv.canvas.height);

            this.newLinkCanv.beginPath();
            if ( this.pointToLink1 !== null){
                    this.newLinkCanv.moveTo(this.pointToLink1.x, this.pointToLink1.y);
                if ( this.pointToAdd !== null){
                    this.newLinkCanv.lineTo(this.pointToAdd.x, this.pointToAdd.y);
                } else if ( this.pointToLink2 !== null){
                    this.newLinkCanv.lineTo(this.pointToLink2.x, this.pointToLink2.y);
                }
            }
            this.newLinkCanv.stroke();
        },
        addLink : function(){
            var t = this;
            if ( t.curTool === t.tools.ADD_POINT){
                let requestUrl = "addNewPoint";
                $.get(serverAddr, { 
                    method: requestUrl, 
                    newX: t.pointToAdd.x, 
                    newY: t.pointToAdd.y, 
                    streetName: t.streetName, 
                    oldId: t.pointToLink1.id, 
                    login: t.user.login, 
                    password: t.user.password 
                }, function(data) {
                    if ( data.status !=="Error"){
                        t.pointToAdd = null;
                        t.refreshPoints();
                    } else {
                        allert("Простите, сервер перестал нас слушаться. Он решил, что он умнее ;(")
                    }
                }, 
                "Json");
            } else if ( t.curTool === t.tools.LINK_POINTS){
                let requestUrl = "addNewLink";
                $.get(serverAddr, {
                    method: requestUrl,
                    point1: t.pointToLink1.id,
                    point2: t.pointToLink2.id,
                    streetName: t.streetName,
                    login: t.user.login,
                    password: t.user.password
                }, function (data) {
                    if (data.status !== "Error") {
                        t.pointToLink1 = null;
                    } else {
                        allert("Простите, сервер перестал нас слушаться. Он решил, что он умнее ;(");
                    }
                });
            }
        },
        refreshPoints : function(){
            let requestURL = "getAllWayPoints";
            var points = [];
            var t = this;
            $.get(
            serverAddr,
            {
                method: requestURL
            },
            function(data) {
                t.existPoints = points;
                for (let p of data.points) {
                    t.addExistPoint(new point(p.id, p.xy[0], p.xy[1]));
                }
            },
            "Json"
            );
        },
        refreshWaySegments : function(){
            let requestURL = "getAllWaySegments";
            var segments = [];
            var t = this; 
            $.get(
            serverAddr,
            {
                method: requestURL
            },
            function(data) {
                if (data.segments){
                    for (let s of data.segments){
                        t.addExistWaySegment( new waySegment(s.p1, s.p2));
                    }
                }
            });
        }
    },
    computed : {
        serverAddr : function(){
            return "http://" + this.serveraddr + "/api";
        }
    },
    watch : {
        curTool : function(){
            if ( this.curTool === this.tools.NONE){
                this.pointToLink1 = null;
                this.pointToLink2 = null;
                this.pointToAdd = null;
            } else if ( this.curTool === this.tools.ADD_POINT){
                this.pointToLink2 = null;
            } else if ( this.curTool === this.tools.LINK_POINTS){
                this.pointToAdd = null;
            }
        },
        isActive : function(){
            var t = this;
            if (this.isActive){
                this.refreshPoints();
                this.refreshWaySegments();
            } else {
                //let points = [];
                //t.existPoints = points;
            }
        },
        existWaySegments : function(){
            
            this.canv =  $("#map-admin-canvas")[0].getContext("2d");
            
            this.canv.strokeStyle = "blue";
            this.canv.lineWidth = 5;
            
            this.canv.clearRect(0, 0, this.canv.canvas.width, this.canv.canvas.height);
            this.canv.beginPath();
            for ( let segment of this.existWaySegments){
                this.canv.moveTo( segment.p1.x, segment.p1.y  );
                this.canv.lineTo( segment.p2.x, segment.p2.y );
            }
            this.canv.stroke();
        },
        pointToLink1 : function(){
            this.drawNewSegment();
        },
        pointToLink2 : function(){
            this.drawNewSegment();
        },
        pointToAdd : function(){
            this.drawNewSegment();
        },
        serveraddr : function(){
            localStorage.setItem(clientId + "serverAddr", this.serveraddr);
            serverAddr = this.serverAddr;
        }
    },
    created : function() {
        
        this.user.login = localStorage.getItem(clientId+"login");
        this.user.password = localStorage.getItem(clientId+"password");
        this.isLogged = localStorage.getItem(clientId+"isLogged");

        this.canv = $("#map-admin-canvas")[0].getContext("2d");
        this.newLinkCanv = $("#map-admin-new-link-canvas")[0].getContext("2d");

        let jq_mapImg = $("#map-image");
        this.canv.canvas.width = jq_mapImg.width();
        this.canv.canvas.height = jq_mapImg.height();

        this.canv.strokeStyle = "blue";
        this.canv.lineWidth = 5;
        
        this.newLinkCanv.strokeStyle = "red";
        this.newLinkCanv.lineWidth = 5;
        this.newLinkCanv.canvas.width = jq_mapImg.width();
        this.newLinkCanv.canvas.height = jq_mapImg.height();
        
        let jq_mapAdminClickArea = $("#map-admin-click-area");
        jq_mapAdminClickArea.width( jq_mapImg.width() );
        jq_mapAdminClickArea.height( jq_mapImg.height() );

        this.serveraddr = localStorage.getItem(clientId + "serverAddr" );
        if (this.serveraddr === null || this.serveraddr === "" || this.serveraddr==="null"){
            this.serveraddr = "80.211.190.22:443";
        }
    }

});


//Код, выполняющийся после загрузки страницы
//Осторожно, куча перемнных в глобальной области видимости
$(window).on('load', function(){
    
    
    loggedUser = null;
    loggedUserPassword = null;

    //Адрес сервака, возможно, будет ненужным

    //serverAddr = "http://192.168.88.151:443/api"
    //serverAddr = "http://80.211.190.22:443/api"

    //Jquery - объект с картинкой карты
    jq_mapImg = $("#map-image");	


    //Холст поверх картинкы карты, чтоб рисовать на нём пути
    canv = document.querySelector("canvas").getContext("2d");
    canv.canvas.width = jq_mapImg.width();
    canv.canvas.height = jq_mapImg.height();
    
    canv.strokeStyle = "blue";
    canv.lineWidth = 5;

    //Jquery - объект с дивом поверх холста с путями, чтоб ставить на него иконки
    //И, возможно, всякии менюшки(но это не точно) 
    jq_mapIconContainer = $("#map-icons");
    jq_mapIconContainer.width( jq_mapImg.width());
    jq_mapIconContainer.height( jq_mapImg.height());
    
    //Отлавливаем нажатия
    jq_mapClickArea = $("#map-click-area");
    jq_mapClickArea.width( jq_mapImg.width());
    jq_mapClickArea.height( jq_mapImg.height());
    //Вот тут
    jq_mapClickArea.on("click", onMapClick);
    
    
    //Контейнер с поисковой строкой
    jq_searchMenuContainer = $("#search-menu");
    jq_searchMenuContainer.on("submit", onSearchSubmit);
    //Сама поисковая строка
    jq_searchRow = jq_searchMenuContainer.find("#search-row");
    
    
    //Контейнер с инфой о пути ( содержит две строки)
    jq_wayInfo = $("#way-info");
    
    //Контейнер для записей об организацияхв точке
    jq_organizationsInfo = $("#organizations-info");
    
    //Контейнер для списка адресов
    jq_addressesInfo = $("#addresses-info");
    
    //Левая менюшка целиком
    jq_leftMenu = $("#left-info");
    hideLeftMenu();
    
    //Менюшка, появляющаяся при клике на карту
    jq_pointMenu = $("#point-menu");
    jq_pointMenu.hide();
    jq_pointMenu.on("click", onPointMenuClick);
    
    //Обратная совместимость)
    jq_addPointMenu = $("#not-exist-elemet");
    
    jq_addNewPointBtn = $("#point-menu").children("#2");
    jq_addNewPointBtn.hide();
    //Последний клик по карте
    lastClickXY = [-1, -1];



    wayPoints = [];
});

    

///////////////////////////////////////////////////////////////
////////////........Окошко со списком адресов...........///////
///////////////////////////////////////////////////////////////

function addOneAddresseInfo( strAddr){
    var addrElem = $(" \
        <div class = 'one-addresse-info card card-body' >" + 
            strAddr + 
        "</div> \
    ");
    
    jq_addressesInfo.append(addrElem);
};

function clearAddressesInfo(){
    jq_addressesInfo.find(".one-addresse-info").remove();
}


///////////////////////////////////////////////////////////////
////////////........Окошко со списком организаций.......///////
///////////////////////////////////////////////////////////////


//Добавить в список организаций (менюшка слева) Ещё одна строчка
function addOneOrganizationInfo( organization ){
    var orgInfoElement = $(" \
            <div class = 'one-organization-info card card-body'> \
                " + organization.name + " <br> \
                " + organization.address + " <br> \
            </div> \
        ");

    orgInfoElement.prop("coordX", organization.point[0]);
    orgInfoElement.prop("coordY", organization.point[1]);			
    orgInfoElement.on("click", onOrganizationClick);
    jq_organizationsInfo.append(orgInfoElement);
};

function onOrganizationClick(event){
    var xy = [];
    xy[0] = event.currentTarget.coordX ;
    xy[1] = event.currentTarget.coordY ;

    $(".red-point").remove();
    addRedPointIcon(xy);
    
    //xy[0] +=  jq_mapIconContainer.offset().left;
    //xy[1] += jq_mapIconContainer.offset().top;
    scrollTo(xy[0], xy[1]);
}

function clearOrganizationsInfo(){
    jq_organizationsInfo.find(".one-organization-info").remove();
};

function refillOrganizationsInfo(organizations){
    clearOrganizationsInfo();
    for (var i = 0; i < organizations.length; i++){
        addOneOrganizationInfo(organizations[i]);
    }
}

///////////////////////////////////////////////////////
///////.......Окошко с инфой о маршруте ....///////////
///////////////////////////////////////////////////////
function setFirstWayPointToWayInfo(strLoc){
    $("#way-info-first-point").text(strLoc);
};
function setSecondWayPointToWayInfo(strLoc){
    $("#way-info-second-point").text(strLoc);
};

function getFirstWayPointToWayInfo(strLoc){
    return $("#way-info-first-point").text();
};
function getSecondWayPointToWayInfo(strLoc){
    return $("#way-info-second-point").text();
};


///////////////////////////////////////////////////////
///////........Левая менюшка в общем........///////////
///////////////////////////////////////////////////////

function showAddressesInfo(){

    jq_wayInfo.hide();
    jq_organizationsInfo.hide();
    jq_addressesInfo.show();
    jq_leftMenu.show();
    jq_addPointMenu.hide();
}


function showOrganizationsInfo(){

    jq_wayInfo.hide();
    jq_addressesInfo.hide();
    jq_organizationsInfo.show();
    jq_leftMenu.show();
    jq_addPointMenu.hide();
}


function showWayInfo(){

    jq_organizationsInfo.hide();
    jq_addressesInfo.hide();
    jq_wayInfo.show();
    jq_leftMenu.show();
    jq_addPointMenu.hide();
}


function showAddPointMenu(){

    jq_organizationsInfo.hide();
    jq_addressesInfo.hide();
    jq_wayInfo.hide();
    jq_leftMenu.show();
    jq_addPointMenu.show();
}

function hideLeftMenu(){
    jq_leftMenu.hide();
}

///////////////////////////////////////////////////////
///////...........Строка поиска.............///////////
///////////////////////////////////////////////////////

function onSearchSubmit(event){
    //alert("Попробуйте сначала найти себя");
    clearMapCanvas();
    serverRequestSearchLoc();
    hidePointMenu();
}

// Это запрос на сервак 
function serverRequestSearchLoc(){
    var searchStr = jq_searchRow.val();
    let requestURL = "GetResult";
    $.get(
            serverAddr,
            {
                method: requestURL,
                request: searchStr
            },
            onServerSearchAnswer,
            "Json"
        );
};

//Это обработка ответа
function onServerSearchAnswer(data, textStatus, jqXHR){
    let points = [];
    points = points.concat( data.points);
    for (let i = 0; i < data.organizations.length; i++ ){
        points = points.concat( [data.organizations[i].point]);
    }

    removeAllPointIcons();
    let minX, minY, maxX, maxY;
    minX = minY = 10000000000;
    maxX = maxY = 0;
    for ( let i = 0; i < points.length; i++){
        addBlackPointIcon( points[i]); //Фигачим точечки
        
        maxX = Math.max(maxX, points[i][0]);
        minX = Math.min(minX, points[i][0]);
        maxY = Math.max(maxY, points[i][1]);
        minY = Math.min(minY, points[i][1]);
    }
    
    centrX = (minX + maxX) / 2 ; //+ jq_mapIconContainer.offset().left;
    centrY = (minY + maxY) / 2 ; //+ jq_mapIconContainer.offset().top;
    
    //TODO тестыыыыыы
    scrollTo(centrX, centrY);

    var orgs = data.organizations;
    if (orgs.length > 0) {
        showOrganizationsInfo();
    }
    else if (data.address) {
        showAddressesInfo();
        clearAddressesInfo();
        addOneAddresseInfo(data.address);
    }
    refillOrganizationsInfo(orgs);
}

///////////////////////////////////////////////////////
///////...............Карта............ ....///////////
///////////////////////////////////////////////////////

//Что произойдёт при нажатии на карту
function onMapClick( event){

    if ( event.target.parentElement.id !== event.currentTarget.id ){
        var xy = getClickCoords( event);
        //alert( xy);
        lastClickXY = xy;
        removeNotWayPointIcons();
        addRedPointIcon(xy);
        setPointMenu(xy);
    }
};

//Узнать адрес точки (по факту, ещё и список организаций, 
//но данную штуку планируется вызывать из "построить маршрут", куда она и запишет адрес)
function whatAddressThere(xy){
    var x = xy[0];
    var y = xy[1];
    
    var requestURL = "GetAddresse"; 
    $.get(
            serverAddr,
            {
                method: requestURL,
                coordinateX: xy[0],
                coordinateY: xy[1]
            }, 					
            onWhatAddressThereAnswer,
            "Json"
    );
};


//Обработка ответа
function onWhatAddressThereAnswer(data, textStatus, jqXHR){
    //var addr = data.object.address ? data.object.address : "";
    var addr = data.address;
    if ( getFirstWayPointToWayInfo() == null || getFirstWayPointToWayInfo() == ""){
        setFirstWayPointToWayInfo(addr ==="" || addr === null ? "------" : addr);
    } else if ( getSecondWayPointToWayInfo() == null || getSecondWayPointToWayInfo() == ""){
        setSecondWayPointToWayInfo(addr ==="" || addr === null ? "------" : addr);
        getWayRequest();
    } else {
        setFirstWayPointToWayInfo(addr ==="" || addr === null ? "------" : addr);
        setSecondWayPointToWayInfo("");
        clearMapCanvas();
    }
}



//По факту ещё и адрес, но это бессмысленно, его в списке организаций посмотрим
function whatOrganizationsThere(xy){
    var x = xy[0];
    var y = xy[1];
    
    var requestURL = "GetAddresse"; 
    $.get(
            serverAddr,
            {
                method: requestURL,
                coordinateX: xy[0],
                coordinateY: xy[1]
            }, 					
            onWhatOrganizationsThere,
            "Json"
    );
};

function onWhatOrganizationsThere(data, textStatus, jqXHR){
    var organizations = data.organizations;
    if (organizations.length >= 1){
        showOrganizationsInfo();
        refillOrganizationsInfo(organizations);
    }else {
        const addr = data.address;
        clearAddressesInfo();
        addOneAddresseInfo(addr);
        showAddressesInfo();
    }
    
}


function getWayRequest(){
    var requestURL = "GetRoute";
    
    pointsOnMap = getWayPointIcons();
    
    $.get(
        serverAddr,
        {
            method: requestURL,
            coordinateX1 : pointsOnMap[0].coordX,
            coordinateY1 : pointsOnMap[0].coordY,
            coordinateX2 : pointsOnMap[1].coordX,
            coordinateY2 : pointsOnMap[1].coordY,
        },
        onGetWay,
        "Json"
    );
}

function onGetWay(data, textStatus, jqXHR){
    let points = data.points;
    drawWay(points);
}
//Получаем координаты точки на которую кликнули
//Координаты относительно начала документа
function getClickCoords(event){
    var x = event.offsetX;
    var y = event.offsetY;
    var xy = [x,y];
    return xy;
};

//Нарисовать путь
// way - массив точек
// точка - массив из двух элементов, [0] - x, [1] - y
function drawWay( way){
    canv.beginPath();
    canv.moveTo( way[0][0], way[0][1] );
    for ( var i = 1; i < way.length; i++){
        canv.lineTo( way[i][0], way[i][1] );
    };
    canv.stroke();
};

//Очистить карту от путей
function clearMapCanvas(){
    canv.clearRect(0, 0, canv.canvas.width, canv.canvas.height);
};


//Открыть менюшку при нажатии на кнопку
function setPointMenu(xy){
    if ( loggedUser != null){
        jq_pointMenu.attr("size", 3);
        jq_addNewPointBtn.show();
    } else {
        jq_pointMenu.attr("size", 2);
        jq_addNewPointBtn.hide();
    }
    var _x = xy[0] + jq_mapIconContainer.offset().left;	
    var _y = xy[1] + jq_mapIconContainer.offset().top;
    
    jq_pointMenu.offset({top:_y, left:_x});
    jq_pointMenu.show();
}

function hidePointMenu(){
    
    jq_pointMenu.offset({top:0, left:0});
    jq_pointMenu.hide();
}

function onPointMenuClick(event){
    selectedIndex = event.currentTarget.selectedIndex;
    if ( selectedIndex === 0){
        
        showWayInfo();
        if( $(".way-point-icon").length >= 2)
            removeWayPointIcons();

        convertPointToWayPoint( $(".point-icon"));
        
        //let point = getRedPointIcons()[0];
        whatAddressThere(lastClickXY);
    
        
        clearMapCanvas();

    } else if (selectedIndex === 1){

        removeWayPointIcons();
        setFirstWayPointToWayInfo("");
        setSecondWayPointToWayInfo("");				

        let point = getRedPointIcons()[0];

        whatOrganizationsThere(lastClickXY);
        
        clearMapCanvas();
    } else if ( selectedIndex === 2){
        clearMapCanvas();
        setFirstWayPointToWayInfo("");
        setSecondWayPointToWayInfo("");
        onChoseAddNewPoint();
    }
    hidePointMenu();
}

//Поставить точку
function addPointIcon(iconSource, xy){
    var iconElement = $(" \
        <img src= \'" + iconSource  + "\' class='point-icon' /> \
    ");
    jq_mapIconContainer.append(iconElement);
    
    iconElement.height(32);
    iconElement.width(16);
    iconElement.prop( "coordX", xy[0]);
    iconElement.prop( "coordY", xy[1]);
    
    var _x = xy[0] + jq_mapIconContainer.offset().left - iconElement.width() / 2;	
    var _y = xy[1] + jq_mapIconContainer.offset().top - iconElement.height();
    iconElement.offset({top:_y, left:_x});
    
    iconElement.css("position");
    return iconElement;
};

function getPointIcons(){
    return $(".point-icon");
}


function getRedPointIcons(){
    return $(".red-point");
}



function addRedPointIcon(xy){
    var redIconSource = "./redPointIcon.png";
    var pointElem = addPointIcon(redIconSource,xy);
    pointElem.addClass("red-point");
    return pointElem;
};

function addBlackPointIcon(xy){
    var blackIconSource = "./blackPointIcon.png";
    var pointElem = addPointIcon(blackIconSource,xy);
    pointElem.addClass("black-point");
    return pointElem;
};



function convertPointToWayPoint(jq_point){

    jq_point.removeClass("point-icon");
    jq_point.addClass("way-point-icon");
    
}

function getWayPointIcons(){
    return $(".way-point-icon");
}

function removeAllPointIcons(){
    removeNotWayPointIcons();
    removeWayPointIcons();
}

function removeNotWayPointIcons(){
    jq_mapIconContainer.find(".point-icon").remove();
};

function removeWayPointIcons(){
    
    var jq_notWayPoint = jq_mapIconContainer.find(".point-icon");
    var notWayPointOffsets = jq_notWayPoint.offset(); //Костыль, иначе - почему-то съезжают
    jq_mapIconContainer.find(".way-point-icon").remove();
    jq_notWayPoint.offset( notWayPointOffsets);
};		


/////////////////////////////////////////
///////////....Админика..////////////////
/////////////////////////////////////////


//////////////////////////////////////////
//////////////Авторизация/////////////////
//////////////////////////////////////////




///////////////////////////////////////////
/////////..Работа с экраном?///////////////
///////////////////////////////////////////

function scrollTo(x,y){
    
    
    // анимируем скроллинг к элементу centerPoint
    $('html, body').animate(
        { 
            //scrollTop: centerPoint.offset().top, 	//Позиция по вертикали
            //scrollLeft: centerPoint.offset().left 
            scrollTop: y, 	//Позиция по вертикали
            scrollLeft: x //Позиция по горизонтали
        }, 
        500										//Скорость
    ); 
};



