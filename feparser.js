//load ZeroClipboard swf for "copy" button functionality
ZeroClipboard.setMoviePath('ZeroClipboard10.swf');
//declare global vars
var outputText;
var outputTable;
var genPreroll = 'http://cdn.video.abc.com/streaming/ads/abccom/abc_generic_preroll_20071031_500x282_400kbps_f8.flv';
var genLogo = 'http://cdn.video.abc.com/streaming/ads/abccom/abcfep_300x60.jpg';
var genLogoClick = 'http://abc.go.com/';
var genPauseAd = 'http://cdn.video.abc.com/streaming/ads/abccom/house_pause_ad2011.swf';
var clipParser = new ZeroClipboard.Client();
var clipTable = [];
		
function feParse() {
	//declare local vars
	var labelTitle;
	var genCheck;
	var inputClass;
	var inputId;
	var inputValue;
	var statusDiv;
	var colorDiv;
	var colorA;
	//clear results
	$('textarea').text("");
	outputText = "";
	$('table#outputTable').text("");
	outputTable = "";
	//process each <tr> in the form
	$('tr').each(function() {
		//get values for vars
		labelTitle = $(this).children('td').children('label').attr('title');
		genCheck = $(this).children('td').children('input.checkBox').is(':checked');
		inputClass = $(this).children('td').children('input:not(.checkBox)').attr('class');
		inputId = $(this).children('td').children('input:not(.checkBox)').attr('id');
		inputValue = $(this).children('td').children('input:not(.checkBox)').val();
		statusDiv = $(this).children('td').children('div.httpStatus').attr('id');
		colorDiv = $(this).children('td').children('div.colorBox').attr('id');
		colorA = $(this).children('td').children('div.colorBox').children('a').attr('id');
		//remove whitespace from start and end of URL
		if(inputValue != $.trim(inputValue)) {
			inputValue = $.trim(inputValue);
			$('input#'+inputId).val(inputValue);
		};
		//check for generic checkboxes; replace path if checked
		if(genCheck) {
			if(inputId == 'inputPreroll') {
				inputValue = genPreroll;
				$('input#'+inputId).val(genPreroll);
			};
			if(inputId == 'inputLogo') {
				inputValue = genLogo;
				$('input#'+inputId).val(genLogo);
			};
			if(inputId == 'inputLogoClick') {
				inputValue = genLogoClick;
				$('input#'+inputId).val(genLogoClick);
			};
			if(inputId == 'inputPauseAd') {
				inputValue = genPauseAd;
				$('input#'+inputId).val(genPauseAd);
			};
		};
		//set href and target for colorbox <a> element
		$('a#'+colorA).replaceWith('<a id="'+colorA+'" href="'+inputValue+'" target="new"></a>');
		//for each ad path: check HTTP status, encode characters, display parser-friendly code
		if(inputClass == 'adPath') {
			//set blank fields to "/" and display warning
			if(inputValue == '' || inputValue == '/') {
				$('input#'+inputId).val('/');
				$('div#'+statusDiv).text('No Path');
				$('div#'+colorDiv).css('background-color','#FFFF00');
				parseUrl('/',labelTitle);
				//encodeChars('',labelTitle+' FILE',labelTitle+'FILE');
				//encodeChars('/',labelTitle+' PATH',labelTitle+'PATH');
			}
			//check for Unicast container swf
			else if(inputValue.match(/.*vwadpath=.+/)) {
				var unicastUrl = inputValue.substr(inputValue.indexOf('vwadpath=')+9);
				requestUrl(unicastUrl,statusDiv,colorDiv);
				parseUrl(inputValue,labelTitle);
			}
			else {
				requestUrl(inputValue,statusDiv,colorDiv);
				parseUrl(inputValue,labelTitle);
			};
		};
		//for each 3rd-party path: encode characters, display parser-friendly code
		if(inputClass == 'thirdParty') {
			//set blank fields to "/" and display warning
			if(inputValue == '' || inputValue == '/') {
				$('input#'+inputId).val('/');
				$('div#'+statusDiv).text('No Path');
				$('div#'+colorDiv).css('background-color','#FFFF00');
				encodeChars('/',labelTitle,labelTitle);
			}
			else {
				requestUrl(inputValue,statusDiv,colorDiv);
				encodeChars(inputValue,labelTitle,labelTitle);
			};
		};
	})
	$('textarea').text(outputText); //dump parser text to textbox
	clipParser.setText(outputText); //set copy button url
	$('#clipParserDiv').children('div').not('#clipParserButton').remove(); //remove existing clip div
	clipParser.glue('clipParserButton', 'clipParserDiv'); //Attach ZeroClipboard swf to copy button
	$('table#outputTable').html(outputTable); //dump table html
	//set and map ZeroClipboard swfs for each table row
	$('table#outputTable').children('tbody').children('tr').each(function(i){
		clipTable[i] = new ZeroClipboard.Client();
		clipTable[i].setText($(this).children('td.url').text());
		$(this).children('td').children('div.clipDiv').children('div').not('.clip').remove();
		clipTable[i].glue($(this).children('td').children('div.clipDiv').children('div.clip').attr('id'),$(this).children('td').children('div.clipDiv').attr('id'));
	});
}
		
//use JSON response from Yahoo Query Language request to deermine whether path is valid; display results in appropriate 'httpStatus' <div>
function requestUrl(url,statusDiv,colorDiv) {
	//create YQL URL
	var yqlUrl = 'http://query.yahooapis.com/v1/public/yql?'+'q=select%20*%20from%20html%20where%20url%3D%22'+encodeURIComponent(url)+'%22&diagnostics=true&format=json&callback=?';
	//set timeout in ms
	$.ajaxSetup( {
		timeout: '2000'
	});
	//make GET request to YQL, load returned data into "data" object
	$.getJSON(yqlUrl, function(data) {
		//check if an invalid URL error was returned; if so, report failure and display error
		if (data.error != undefined) {
			$('div#'+statusDiv).text(data.error.description.substr(0,64));
			$('div#'+colorDiv).css('background-color','#FF0000');
		}
		//check HTTP status code; report success if = 200,301,302
		else if (data.query.diagnostics.url['http-status-code'] == '200' || data.query.diagnostics.url['http-status-code'] == '301' == data.query.diagnostics.url['http-status-code'] == '302') {
			$('div#'+statusDiv).text('Success!');
			$('div#'+colorDiv).css('background-color','#00FF00');
		}
		//check for absence of diagnostics url error; if absent, report success
		else if (data.query.diagnostics.url.error == undefined) {
			$('div#'+statusDiv).text('Success!');
			$('div#'+colorDiv).css('background-color','#00FF00');
		}
		//otherwise report failure and display url error
		else {
			$('div#'+statusDiv).text(data.query.diagnostics.url.error.substr(0,64));
			$('div#'+colorDiv).css('background-color','#FF0000');
		};
	});
}

//separate ad URLs into path and file, then encode characters
function parseUrl(url,labelTitle) {
	var urlPath = url.substring(0,url.lastIndexOf('/')+1);
	var urlFile = url.substring(url.lastIndexOf('/')+1);
	encodeChars(urlFile,labelTitle+' FILE',labelTitle+'FILE');
	encodeChars(urlPath,labelTitle+' PATH',labelTitle+'PATH');
}

//encode special characters (&, |, space), replace old CDN subdomain and timestamps, then output parser code and table
function encodeChars(inputValue,parserName,clipId) {
	var encodedUrl = inputValue;
	var clipParser = new ZeroClipboard.Client();
	encodedUrl = encodedUrl.replace(/\&(?![A-Za-z]+;|#[0-9]+;)/g, "&amp;");
	encodedUrl = encodedUrl.replace(/\|/g, "%7C");
	encodedUrl = encodedUrl.replace(/\s/g, "%20");
	encodedUrl = encodedUrl.replace(/ll\.media/, "cdn.video");
	encodedUrl = encodedUrl.replace(/%timestamp%/g, '%TIME%');
	encodedUrl = encodedUrl.replace(/\[timestamp\]/g, '%TIME%');
	encodedUrl = encodedUrl.replace(/%5[Bb]timestamp%5[Dd]/g, '%TIME%');
	outputText += '*BEGIN '+parserName+'*'+encodedUrl+'*END '+parserName+'* ';
	encodedUrl = encodedUrl.replace(/\&amp;/g, "&amp;amp;");
	outputTable += '<tr><td class="name">'+parserName+'</td><td class="url">'+encodedUrl+'</td><td class="clipTd"><div id="clipDiv'+clipId+'" class="clipDiv"><div id="clipButton'+clipId+'" class="clip">Copy</div></div></td></tr>';
}