// this port is available as soon as popup is opened
var popupPort = chrome.runtime.connect({name: 'POPUPCHANNEL'});
var renderList = function (requests) {
    var lists = requests.map(function (item) {
      return '<li><span>' + item.method + '</span><span>' + item.url + '</span></li>';
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

$('#requests-list').on('click', 'li', function (e) {
  var target = $(e.currentTarget);
  var url = target.find('span:nth-child(2)').text();
  var method = target.find('span:nth-child(1)').text();

  $[method.toLowerCase()](url).complete(function (response) {
    var responseText = response.responseText;

    try {
      $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
    } catch (e) {
      $('#response').html(responseText);
    }
    toggleDetailView(true);
  });
});

$('#detail-view .close-icon').on('click', toggleDetailView);

$('#request-type-tabs li').on('click', filterRequestsByType);

$('.filter-input').on('keyup', filterRequestsByKeywords);

function filterRequestsByKeywords(e) {
  var val = $(e.currentTarget).val(),
      requests = getRequestsByKeywords(val);
  console.log(requests);
  renderList(requests);    
}

  

function filterRequestsByType(e) {
  var target = $(e.currentTarget),
      type = target.data('type'),
      requests = getRequestsByType(type);

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
function getRequestsByType(type) {
  var requests = JSON.parse(localStorage.getItem('requests'));

  type = type ? type : 'all';
  type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;

  return type === 'all' ? requests : requests.filter(function (item) {
    if (type instanceof Array) {
      return type.indexOf(item.type) > -1;
    } else {
      return item.type === type; 
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



function toggleDetailView(visible) {
  $('#detail-view').toggle(visible);
}
