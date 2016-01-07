// alert(1);
// alert(chrome.devtools.network);
chrome.devtools.network.onRequestFinished.addListener(
    function(request) {
    	console.log('onRequestFinished');
    	// alert('onRequestFinished');
      // if (request.request.url.indexOf('127.0.0.1/Mission/edit') > -1) {
        // alert(request.request.url); 
        // localStorage.setItem(request.request.url + '__' + new Date().getTime(), JSON.stringify(request));
        
        chrome.experimental.devtools.console.addMessage(
            chrome.experimental.devtools.console.Severity.Warning,
            "Large image: " + request.request.url);
        if (request.response.bodySize > 40*1024)
        chrome.experimental.devtools.console.addMessage(
            chrome.experimental.devtools.console.Severity.Warning,
            "Large image: " + request.request.url);
      // } 
      
});
