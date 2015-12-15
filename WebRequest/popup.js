// this port is available as soon as popup is opened
var popupPort = chrome.runtime.connect({name: 'POPUPCHANNEL'});
var renderList = function (requests) {
    var keyword = $('.filter-input').val(),
        type = $('#request-type-tabs li.selected').data('type');

    requests = !keyword && type === 'all' ? requests : getRequestsByType(type, keyword);
    lists = requests.map(function (item) {
        return '<li data-id="' + item.requestId + '""><span>' + item.method + '</span><span title="' +  item.url + '">' + item.url + '</span><span class="close-icon">X</span></li>';
    }).join('');
    $('#requests-list').html(lists);
};

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
      requests = getRequestsByType(type, val);

  console.log(requests);
  renderList(requests);    
} 

function filterRequestsByType(e) {
  var target = $(e.currentTarget),
      type = target.data('type'),
      keyword = $('.filter-input').val(),
      requests = getRequestsByType(type, keyword);

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

// types: ["other", "image", "xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]
function getRequestsByType(type, keyword) {
  var requests = JSON.parse(localStorage.getItem('requests'));

  type = type ? type : 'all';
  type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;

  return type === 'all' && !keyword ? requests : requests.filter(function (item) {
      if (type instanceof Array) {
          return type.indexOf(item.type) > -1 && (keyword ? new RegExp(keyword, 'gi').test(item.url) : true);
      } else {
        if (type === 'all') {
            return keyword ? new RegExp(keyword, 'gi').test(item.url) : true;
        } else {
            return item.type === type && (keyword ? new RegExp(keyword, 'gi').test(item.url) : true);
        }
      }
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
