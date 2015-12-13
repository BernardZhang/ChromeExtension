alert(1);
alert(chrome.devtools.network);
chrome.devtools.network.onRequestFinished.addListener(
    function(request) {
    	console.log('onRequestFinished');
    	alert('onRequestFinished');
    	localStorage.setItem(JSON.stringify(request), JSON.stringify(request));
    	chrome.experimental.devtools.console.addMessage(
          chrome.experimental.devtools.console.Severity.Warning,
          "Large image: " + request.request.url);
      if (request.response.bodySize > 40*1024)
      chrome.experimental.devtools.console.addMessage(
          chrome.experimental.devtools.console.Severity.Warning,
          "Large image: " + request.request.url);
});
