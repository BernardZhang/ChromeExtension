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
  });
});
