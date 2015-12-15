// this port is available as soon as popup is opened
var popupPort = chrome.runtime.connect({name: 'POPUPCHANNEL'});
var renderList = function (requests) {
    var lists = requests.map(function (item) {
        return '<li data-id="' + item.requestId + '""><span>' + item.method + '</span><span title="' +  item.url + '">' + item.url + '</span><span class="send-btn">Send</span><span class="close-icon">X</span></li>';
    }).join('');
    $('#requests-list').html(lists);
};

setReportDomain();

// long-lived connection to the background channel 
chrome.runtime.onConnect.addListener(function(port){
  console.assert(port.name === 'BACKGROUNDCHANNEL');
  console.log("Connected to background");

  port.onMessage.addListener(function(data) {
    console.log("Received message from popup", data);
    renderList(data.msg);

    // localStorage.setItem("Received message from popup", JSON.stringify(msg));
  });

});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.greeting == "hello")
      sendResponse({farewell: "goodbye"});
    else
      sendResponse({}); // snub them.
});

$('#clear-list').on('click', function () {
  renderList([]);
  popupPort.postMessage({
    action: 'clearRequests'
  });
});

$('#requests-list').on('click', 'li', selectRequestItem);

$('#detail-view .close-icon').on('click', toggleDetailView);

$('#request-type-tabs li').on('click', filterRequestsByType);

$('.filter-input').on('keyup', filterRequestsByKeywords);

$('.detail-view-tabs li').on('click', switchDetailViewTab);

$('.list-view').on('click', 'li .close-icon', deleteRequestAction);

$('.list-view').on('click', '.send-btn', sendRequestAction);

$('#report-domain').on('change', changeReportDomain);

$('#method-type-select').on('change', changeHttpMethod);

function changeHttpMethod(e) {
    var method = $(e.currentTarget).val(),
        type = $('#request-type-tabs li.selected').data('type'),
        keywords = $('.filter-input').val();

    renderList(getRequestsByFilter(type, keywords, method));
}

function setReportDomain(domain) {
    domain = domain || localStorage.getItem('reportDomain') || '';
    localStorage.setItem('reportDomain', domain);
    $('#report-domain').val(domain);
}

function getReportDomain() {
    return $('#report-domain').val();
}

function changeReportDomain(e) {
    setReportDomain($(e.currentTarget).val());
}

function sendRequestAction(e) {
    var target = $(e.currentTarget),
        li = target.closest('li'),
        requestId = li.data('id'),
        request = getRequestById(requestId),
        sendHost = getReportDomain(),
        domainReg = /https{0,1}:\/\/[^\/]+(\/.*)*/gi,
        newUrl = request.url.replace(domainReg, sendHost + '$1');

    if (!domainReg.test(sendHost)) {
        alert('请输入正确的域名,格式如: http://baidu.com');
        return false;
    }

    $[request.method.toLowerCase()](newUrl).complete(function (response) {
        var responseText = response.responseText;

        try {
            $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
        } catch (e) {
            $('#response').html(responseText);
        }
    });

    e.stopPropagation();
}

function deleteRequestAction(e) {
    var target = $(e.currentTarget),
        li = target.closest('li'),
        requestId = li.data('id');

    popupPort.postMessage({
        action: 'deleteRequest',
        requestId: requestId
    });

    e.stopPropagation();
}

function switchDetailViewTab(e) {
    var target = $(e.currentTarget),
        id = target.data('href');

    $(id).siblings().hide();
    $(id).show();
    target.siblings().removeClass('selected');
    target.addClass('selected');
}

function selectRequestItem(e) {
    var target = $(e.currentTarget);
    var request = getRequestById(target.data('id'));

    renderRequestHeader(request);
    renderResponse(request);
    toggleDetailView(true);
}

function renderRequestHeader(request) {
    var requestHeaders = request.requestHeaders || [],
        headersHtml = requestHeaders.map(function (item) {
            return '<li><span>' + item.name + ':</span><span>' + item.value + '</span></li>'
        }).join('');

    $('#header').html(headersHtml);
}

function renderResponse(request) {
    var method = request.method,
        url = request.url;

    if (['main_frame', 'sub_frame'].indexOf(request.type) !== -1) {
        $('#response').html('<iframe src="' + request.url +'"></iframe>');
    } else if (request.type === 'image') {
        $('#response').html('<img src="' + request.url + '">');
    } else {
        $[method.toLowerCase()](url).complete(function (response) {
            var responseText = response.responseText;

            try {
                $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
            } catch (e) {
                $('#response').html(responseText);
            }
        });
    }
}

function filterRequestsByKeywords(e) {
  var val = $(e.currentTarget).val(),
      type = $('#request-type-tabs li.selected').data('type'),
      method = $('#method-type-select').val(),
      requests = getRequestsByFilter(type, val, method);

  console.log(requests);
  renderList(requests);    
} 

function filterRequestsByType(e) {
  var target = $(e.currentTarget),
      type = target.data('type'),
      keyword = $('.filter-input').val(),
      method = $('#method-type-select').val(),
      requests = getRequestsByFilter(type, keyword, method);

  target.siblings('li').removeClass('selected');
  target.addClass('selected');

  renderList(requests);
  console.log(requests);
  var obj = {};
  requests.forEach(function (item) {
    obj[item.type] = true;
  });

  console.log(Object.keys(obj));
}

function getRequests() {
    return JSON.parse(localStorage.getItem('requests'));
}

// types: ["other", "image", "xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]
function getRequestsByFilter(type, keyword, method) {
    var requests = getRequests();

    type = type ? type : 'all';
    type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;
    method = method || '';

    if (type === 'all' && !keyword && !method) {
        return requests
    }

    return requests.filter(function (item) {
        var typeMatch = type instanceof Array ? type.indexOf(item.type) > -1 : (item.type === type || type === 'all'),
            keywordMatch = keyword ? new RegExp(keyword, 'gi').test(item.url) : true,
            methodMatch = method ? new RegExp(method, 'gi').test(item.method) : true;

        return typeMatch && keywordMatch && methodMatch;
    });
}

// types: ["other", "image", "xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]
function getRequestsByType(type, keyword, method) {
  var requests = getRequests();

  type = type ? type : 'all';
  type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;
  method = method || '';

  if (type === 'all' && !keyword && !method) {
      return requests
  }

  return requests.filter(function (item) {
      var typeMatch = type instanceof Array ? type.indexOf(item.type) > -1 : (item.type === type || type === 'all'),
          keywordMatch = keyword ? new RegExp(keyword, 'gi').test(item.url) : true,
          methodMatch = method ? new RegExp(method, 'gi').test(item.method) : true;

      return typeMatch && keywordMatch && methodMatch;
  });
}

function getRequestsByKeywords(keyword) {
  var requests = getRequestsByType();

  if (keyword) {
    return requests.filter(function (item) {
      return new RegExp(keyword, 'gi').test(item.url);
    });
  }

  return requests;
}

function getRequestById(id) {
  return getRequestsByType().filter(function (item) {
    return item.requestId == id;
  })[0];
}



function toggleDetailView(visible) {
  $('#detail-view').toggle(visible);
}
