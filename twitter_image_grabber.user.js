// ==UserScript==
// @name        Twitter-Image-Grabber
// @description Easier copying of image links in tweets, with user for source
// @author      Kethsar
// @version     1.3
// @match       https://twitter.com/*
// @inject-into auto
// @grant       GM_setClipboard
// @grant       GM.setClipboard
// @updateURL   https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_image_grabber.user.js
// @downloadURL https://raw.githubusercontent.com/Kethsar/twitter_image_links/master/twitter_image_grabber.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    /***** CONFIG *****/
    // Set to true to allow middle-clicking tweet images to copy links
    // Copies links for all images by default
    // Ctrl+middle-clicking will copy the link only for the image clicked on
    // false to disable
    // NOT SETUP ON NU-TWITTER
    const USE_MIDDLE_CLICK = true;
    
    // Set to true to show the Copy "buttons" on tweets with images
    // false to disable
    const SHOW_COPY_BUTTONS = true;
    
    // Clicking the Images button for multi-image tweets will copy all image links
    // false to disable
    const COPY_ALL = true;
    
    // Show when you are not following a user by making their name colour red
    const SHOW_NOT_FOLLOW = true;
    /***** END CONFIG *****/
    
    const LEFT_CLICK = 0,
          MIDDLE_CLICK = 1;
    
    var setClipboard = null,
        // store console.log because for some reason Twitter fucks it after fully loading, at least for me
        // No longer the case on nu-twitter but whatever
        log = console.log,
        interval = 0;
    
    function init()
    {
        if (GM_setClipboard)
        {
            setClipboard = GM_setClipboard;
        }
        else if (typeof(GM) != "undefined" && GM.setClipboard)
        {
            setClipboard = GM.setClipboard;
        }
        else
        {
            log("Clipboard setter not found, image grabber disabled");
            return;
        }
        
        try
        {
            createEventListeners();
        }
        catch(e)
        {
            log(e);
        }
    }
    
    function createEventListeners()
    {
        let react = document.getElementById("react-root") != null;
        if (react)
        {
            if (SHOW_COPY_BUTTONS)
            {
                document.addEventListener("click", hideOpenImglist);
                interval = setInterval(createThingsNu, 500);
            }
        }
        else
        {
            if (USE_MIDDLE_CLICK)
                document.addEventListener('mousedown', mousedownHandler);
            
            if (SHOW_COPY_BUTTONS)
            {
                document.addEventListener("click", hideOpenImglist);
                interval = setInterval(createThings, 500);
            }
        }
    }
    
    function mousedownHandler(e)
    {
        if (e.button == MIDDLE_CLICK)
        {
            let ele = e.target,
                tag = ele.tagName.toLowerCase();
            
            if (tag != "img" && !ele.classList.contains("GalleryNav"))
                return; // Only copy things if images were clicked
            
            while (!(ele.classList.contains('tweet') || ele.classList.contains('Gallery-content'))
                   && ele != null)
            {
                ele = ele.parentElement;
            }

            if (ele)
            {
                e.preventDefault();
                if (ele.classList.contains('Gallery-content'))
                    ele = ele.getElementsByClassName("tweet")[0];
                
                let uname = ele.attributes.getNamedItem("data-screen-name"),
                    images = [];

                if (uname) uname = uname.value;

                if (!e.ctrlKey)
                {
                    let imgEles = ele.getElementsByClassName("js-adaptive-photo");
                    for (let imge of imgEles)
                    {
                        let link = imge.attributes.getNamedItem("data-image-url").value;
                        if (link)
                        {
                            let format = link.match(/\.([^?/:]+)[^/]*$/)[1];
                            link = link.replace(/\.[^/]+$/, "." + format + "?name=orig");
                            images.push(link);
                        }
                    }

                    if (images.length == 1)
                        images[0] = images[0] + "#@" + uname;
                }
                else
                {
                    let imgele = null;
                    if (e.target.tagName.toLowerCase() == "img")
                    {
                        imgele = e.target;
                    }
                    else if (e.target.classList.contains("GalleryNav"))
                    {
                        imgele = e.target.parentElement.getElementsByClassName("media-image")[0];
                    }
                    
                    if (imgele)
                    {
                        let format = imgele.src.match(/\.([^?/:]+)[^/]*$/)[1];
                        let src = imgele.src.replace(/\.[^/]+$/, "." + format + "?name=orig");
                        images.push(src + "#@" + uname);
                    }
                }

                if (images.length > 0)
                {
                    let copyTxt = "";
                    for (let i of images)
                    {
                        copyTxt += i + " | ";
                    }

                    if (images.length > 1)
                        copyTxt += "twitter: @" + uname;

                    copyTxt = copyTxt.replace(/[ |]+$/, "");
                    setClipboard(copyTxt);
                }
            }
        }
    }
    
    function createThings()
    {
        if (document.readyState != "complete")
            return;
        
        clearInterval(interval);
        createStyles();
        createStreamObserver();
        createContainerObserver();
        createPlinkOlayObserver();
        createGalleryObserver();
        log("Image Grabber loaded");
    }
    
    function createStyles()
    {
        let css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".imgList { position: absolute; z-index: 99; background-color: white; visibility: hidden; }\n" +
                        ".imgLnk { padding: 5px; color: black; display: block; font-size: 14px; }\n" +
                        ".imgLnk:hover { color:red }\n" +
                        ".not-following { color: red; }";
        
        document.head.appendChild(css);
    }
    
    function createStreamObserver(strim)
    {
        if (!strim)
            strim = document.getElementById("stream-items-id");
        
        let tweets = strim.getElementsByClassName("tweet"),
            strimObsCfg = {childList: true},
            strimo = new MutationObserver(streamObserveHandler);
        
        addCopyButtons(tweets);
        
        strimo.observe(strim, strimObsCfg);
    }
    
    function streamObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            for (let an of m.addedNodes)
            {
                let tweets = an.getElementsByClassName("tweet");
                addCopyButtons(tweets);
            }
        }
    }
    
    function createContainerObserver()
    {
        let pc = document.getElementById("page-container"),
            pcObsCfg = {childList: true},
            pcmo = new MutationObserver(containerObserveHandler);

        pcmo.observe(pc, pcObsCfg);
    }
    
    function containerObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            for (let an of m.addedNodes)
            {
                if (an.nodeName.toLowerCase() == "div" &&
                   (an.id == "timeline" || an.classList.contains("AppContainer")))
                {
                    createStreamObserver();
                    break;
                }
            }
        }
    }
    
    function createGalleryObserver()
    {
        // Turns out the GalleryTweet is replaced each time the image in the gallery is changed
        // Even if it is an image for the same tweet. That you are cycling through
        // Well, makes things easier for me, cause the Gallery Tweet doesn't load in as fast as the actual image
        // making it so the copy button could not be made if I observed for changes to the gallery image
        let galleryTweet = document.getElementsByClassName("GalleryTweet")[0],
            galleryObsCfg = {childList: true},
            gtmo = new MutationObserver(galleryObserveHandler);
        
        gtmo.observe(galleryTweet, galleryObsCfg);
    }
    
    function galleryObserveHandler(mlist, obs){
        for (let m of mlist)
        {
            if (m.addedNodes.length > 0)
            {
                // It should just be one, if any, since it's one image
                let tweet = m.target.getElementsByClassName("tweet")[0],
                    uname = tweet.attributes.getNamedItem("data-screen-name"),
                    actList = tweet.getElementsByClassName("ProfileTweet-actionList")[0],
                    img = document.getElementsByClassName("media-image")[0];

                if (uname)
                    uname = uname.value;

                let cBtn = createCopyButton([img], uname),
                    actlast = actList.children.length - 1;
                
                actList.insertBefore(cBtn, actList.children[actlast]);
            }
        }
    }
    
    function createPlinkOlayObserver()
    {
        let plinkOlay = document.getElementsByClassName("PermalinkOverlay")[0],
            plinkOlayBody = plinkOlay.getElementsByClassName("PermalinkOverlay-body")[0],
            poObsCfg = {childList: true},
            pomo = new MutationObserver(plinkolayObserveHandler);
        
        if (plinkOlay.classList.contains("load-at-boot"))
            addBtnsToPlinkOlay(plinkOlayBody);
        
        pomo.observe(plinkOlayBody, poObsCfg);
    }
    
    function plinkolayObserveHandler(mlist, obs)
    {
        for (let m of mlist)
        {
            if (m.addedNodes.length > 0)
            {
                addBtnsToPlinkOlay(m.target);
                break;
            }
        }
    }
    
    function addBtnsToPlinkOlay(plinkOlay)
    {
        let tc = plinkOlay.getElementsByClassName("permalink-tweet-container")[0],
            tweet = tc.getElementsByClassName("tweet");

        addCopyButtons(tweet);

        // This is fine because this function is only called once upon the permalink overlay popping-up
        let strims = plinkOlay.getElementsByClassName("js-navigable-stream");
        if (strims.length > 0)
        {
            createStreamObserver(strims[0]);
        }
    }
    
    function addCopyButtons(tweets)
    {
        for (let t of tweets)
        {
            addCopyButton(t);
            
            if (SHOW_NOT_FOLLOW)
                addNotFollowingText(t);
        }
    }
    
    function addCopyButton(tweet)
    {
        if (tweet && tweet.classList.contains("has-content"))
        {
            let imgEles = tweet.getElementsByClassName("js-adaptive-photo"),
                uname = tweet.attributes.getNamedItem("data-screen-name"),
                cBtns = tweet.getElementsByClassName("cimgLnk");
            
            if (imgEles.length < 1) return;
            
            if (uname) uname = uname.value;
            
            // this tweet had copy buttons added to it before, and they have persisted
            // However, the event handlers have been wiped. Remove and redo them
            if (cBtns.length > 0)
            {
                let ele = cBtns[0];
                for (let i = 0; i < 5; i++) // built-in loop limiter haha
                {
                    ele = ele.parentElement;
                    if (ele && ele.classList.contains("ProfileTweet-action"))
                    {
                        ele.remove();
                        break;
                    }
                }
            }
            
            let actList = tweet.getElementsByClassName("ProfileTweet-actionList")[0];
            let cBtn = createCopyButton(imgEles, uname);
            
            actList.appendChild(cBtn);
        }
    }
    
    function createCopyButton(imgEles, uname)
    {
        let btnDiv = document.createElement("div");
        btnDiv.classList.add("ProfileTweet-action");
        
        if (imgEles.length > 1)
        {
            let btn = document.createElement("a"), // "button", right
                imlDiv = document.createElement("div"),
                wrapDiv = document.createElement("div");
            
            btn.classList.add("ProfileTweet-actionButton");
            btn.innerText = "Images";
            btn.href = "#";
            btn.addEventListener("click", function(e){
                e.preventDefault();
                
                let imgList = e.target.nextElementSibling;
                if (!imgList.style.visibility)
                {
                    imgList.style.visibility = "visible";
                    if (COPY_ALL) multiImageCopy(e.target);
                }
                else
                {
                    imgList.style.visibility = "";
                }
                
                if (imgList.id != "imgList")
                {
                    let il = document.getElementById("imgList");
                    if (il)
                    {
                        il.id = "";
                        il.style.visibility = "";
                    }
                    
                    imgList.id = "imgList";
                }
            });
            
            imlDiv.classList.add("imgList");
            wrapDiv.classList.add("ProfileTweet-actionButton");
            
            for (let i = 0; i < imgEles.length; i++)
            {
                let link = "",
                    ele = imgEles[i];
                
                if (ele.tagName.toLowerCase() == "div")
                    link = ele.attributes.getNamedItem("data-image-url").value;
                else if (ele.tagName.toLowerCase() == "img")
                    link = ele.src;
                
                if (link)
                {
                    let format = link.match(/\.([^?/:]+)[^/]*$/)[1];
                    link = link.replace(/\.[^/]+$/, "." + format + "?name=orig");
                    if (uname)
                        link = link + "#@" + uname;
                    
                    let a = createBtnForLink(link, i+1);
                    imlDiv.appendChild(a);
                }
            }

            wrapDiv.appendChild(btn);
            wrapDiv.appendChild(imlDiv);
            btnDiv.appendChild(wrapDiv);
        }
        else
        {
            let link = "",
                ele = imgEles[0];
            
            if (ele.tagName.toLowerCase() == "div")
                link = ele.attributes.getNamedItem("data-image-url").value;
            else if (ele.tagName.toLowerCase() == "img")
                link = ele.src;
            
            if (link)
            {
                let format = link.match(/\.([^?/:]+)[^/]*$/)[1];
                link = link.replace(/\.[^/]+$/, "." + format + "?name=orig");
                if (uname)
                    link = link + "#@" + uname;

                let btn = createBtnForLink(link, 0);
                btnDiv.appendChild(btn);
            }
        }
        
        return btnDiv;
    }
    
    function createBtnForLink(link, num)
    {
        let btn = document.createElement("a"); // "button", right
        btn.classList.add("cimgLnk");
        btn.href = link;
        btn.addEventListener("click", imgLinkClick);
        
        if (num == 0)
        {
            btn.classList.add("ProfileTweet-actionButton");
            btn.innerText = "Copy";
        }
        else
        {
            btn.innerText = "Copy " + (num);
            btn.classList.add("imgLnk");
        }
        
        return btn;
    }
    
    function imgLinkClick(e)
    {
        if (e.button == LEFT_CLICK && !e.ctrlKey)
        {
            e.preventDefault();
            e.stopPropagation();
            setClipboard(e.target.href);
        }
    }
    
    function addNotFollowingText(tweet)
    {
        let following = tweet.getAttribute("data-you-follow");
        
        if (following && following == "false")
        {
            let fname = tweet.getElementsByClassName("fullname")[0];
            
            fname.classList.add("not-following");
        }
    }
        
    function multiImageCopy(ele)
    {
        let links = ele.parentElement.getElementsByClassName("imgLnk");
        
        if (links.length < 1) return;

        let uname = links[0].href.replace(/.*#/, ""),
            images = [];
        
        for (let img of links)
        {
            let link = img.href.replace(/#.*/, "");
            if (link)
                images.push(link);
        }

        if (images.length == 1 && uname)
            images[0] = images[0] + "#" + uname;
        
        if (images.length > 0)
        {
            let copyTxt = "";
            for (let i of images)
            {
                copyTxt += i + " | ";
            }

            if (images.length > 1 && uname)
                copyTxt += "twitter: " + uname;

            copyTxt = copyTxt.replace(/[ |]+$/, "");
            setClipboard(copyTxt);
        }
    }
    
    function hideOpenImglist(e)
    {
        if (!e.target.classList.contains("imgLnk"))
        {
            let next = e.target.nextElementSibling;
            if (!next || !next.classList.contains("imgList"))
            {
                let il = document.getElementById("imgList");
                if (il) il.style.visibility = "";
            }
        }
    }

    /****************************
     * RETARDED-TWITTER ALTERNATIVE FUNCTIONS
     ****************************/

    const TWEET_BUTTON_CLASS = "r-1mdbhws";
    const FOCUSED_TWEET_BUTTON_CLASS = "r-a2tzq0";
    const MODAL_BUTTON_CLASS = "r-10m99ii";

    var btnDivClassList = null,
        imgLinkClassList = null,
        focusedTweet = false,
        initialLoad = true,
        obsNodes = {};
    
    function createThingsNu()
    {
        if (document.readyState != "complete")
            return;
        
        clearInterval(interval);
        createStylesNu();
        createRootObserver();
        log("Image Grabber loaded");
    }

    function createStylesNu()
    {
        let css = document.createElement("style");
        css.type = "text/css";
        css.innerHTML = ".imgList { position: absolute; z-index: 99; background-color: white; visibility: hidden; bottom: 20px; }\n" +
                        ".copybtn { text-decoration: none; }\n" +
                        ".copybtn:hover { color: red }\n" +
                        ".imgLnk { padding: 5px; color: black; display: block; font-size: 14px; }\n" +
                        ".not-following { color: red; }";
        
        document.head.appendChild(css);
    }
  
    function createRootObserver() {
        let root = document.getElementById("react-root"),
            obs = new MutationObserver(rootHandler);
      
        obs.observe(root, {childList: true, subtree: true});
    }
  
    function rootHandler(mlist, obs) {
        for (let mtn of mlist) {
            for (let an of mtn.addedNodes) {
                let modal = an.getElementsByClassName(MODAL_BUTTON_CLASS);
                if (modal.length == 1) {
                    obsNodes.modal = an;
                    let modalObs = new MutationObserver(modalHandlerNu);
                    modalObs.observe(an, {childList: true, subtree: true});
                }
              
                // I don't even fucking know about the rest of this handler.
                // It wasn't working, undid changes, redid them slowly checking along the way
                // Final code result was the same but it was working
                // Fuck I hate this
                // God this code is just awful too why does it work
                
                // Apparently most things added are divs and images
                // Sometimes they are within an article, sometimes not
                // I have no idea when it's which
                // So just check for articles, cycle through them if they exist attempting to add buttons
                // If not make sure the element is an image element
                // since those are one of the commonly added in-article elements
                // and they come with attributes to make it easy to identify them
                let artics = an.getElementsByTagName("article");
                if (artics.length > 0) {
                    for (let artic of artics)
                        addCopyButtonNu(artic);
                  
                    continue;
                }
              
                let hasImage = false;
                if (!hasImage)
                    hasImage = an.hasAttribute("aria-label") && an.getAttribute("aria-label").toLowerCase() == "image";
                if (!hasImage)
                    hasImage = an.hasAttribute("alt") && an.getAttribute("alt").toLowerCase() == "image";
              
                if (hasImage) {
                    let parent = an.parentElement;
        
                    while (parent) {
                        if (parent.tagName.toLowerCase() == "article") {
                            addCopyButtonNu(parent);
                            break;
                        }

                        parent = parent.parentElement;
                    }
                }
            }
        }
    }
    
    function modalHandlerNu(mlist, obs) {
        for (let mtn of mlist) {
            if (mtn.target.getElementsByTagName("img").length > 0 && obsNodes.modal) {
                createModalCopyBtnNu(obsNodes.modal);
                obsNodes.modal = null;
                obs.disconnnect();
                break;
            }
        }
    }
    
    function createModalCopyBtnNu(modalDiv) {
        if (document.getElementById("modal-copy")) return; // If we already placed the button, don't bother doing it again.
        let modalBtns = modalDiv.getElementsByClassName(MODAL_BUTTON_CLASS);
        if (modalBtns.length != 1) return; // There should only be one element with the class

        let actList = modalBtns[0];
        let pnSplit = window.location.pathname.split("/"),
            imgNum = parseInt(pnSplit[pnSplit.length - 1]) - 1,
            uname = pnSplit[1];

        let btnDivCList = actList.children[0].classList;
        let imgLinkCList = actList.children[0].children[0].children[0].classList;
        let imgs = [modalDiv.getElementsByTagName("img")[imgNum].src];
      
        let cBtn = createCopyButtonNu(imgs, uname);
        cBtn.classList = btnDivCList;
        cBtn.children[0].classList = imgLinkCList;
        cBtn.children[0].classList.add("copybtn");
        cBtn.children[0].id = "modal-copy";
        actList.insertBefore(cBtn, actList.children[actList.childElementCount - 1]);

        let ul = modalDiv.getElementsByTagName("ul");
        if (ul.length > 0) {
            let arrowDiv = ul[0].parentElement.nextElementSibling;
            let outerDiv = ul[0].parentElement.parentElement.parentElement.parentElement; // This will ensure keyup is caught hopefully always
            arrowDiv.addEventListener("click", modalImageChangeHandlerNu);
            outerDiv.addEventListener("keyup", modalImageChangeHandlerNu);
        }
    }

    function modalImageChangeHandlerNu(e) {
        setTimeout(setModalLinkNu, 50); // Event fires before window.location changes, so just wait a bit
    }

    function setModalLinkNu() {
        let modalCopyBtn = document.getElementById("modal-copy");
        if (!modalCopyBtn) return;

        let pnSplit = window.location.pathname.split("/"),
            imgNum = parseInt(pnSplit[pnSplit.length - 1]) - 1,
            uname = pnSplit[1],
            imgList = document.getElementsByTagName("ul")[0], // Apparently the ul in the image pop-up modal is the only ul in the document
            imgs = imgList.getElementsByTagName("img"),
            image = imgs[imgNum].src;

        let format = image.match(/format=([^&]+)/)[1];
        let link = image.replace(/\?.*$/, "." + format + "?name=orig");

        if (uname)
            link = link + "#@" + uname;

        modalCopyBtn.href = link;
    }

    // Can't use classes to find the images anymore because ~~~OBFUSCATION~~~
    // Find all images in a tweet and return ones with media in the src
    // Other types like profile images and dumb emoji are not stored under media
    function getImagesNu(tdiv) {
        let imgs = tdiv.getElementsByTagName("img"),
            mediaImages = [];
        
        if (imgs.length > 0)
        {
            for (let i of imgs) {
                let ssrch = -1,
                    imgAlt = false;
              
                if (i.hasAttribute("alt") && i.getAttribute("alt").toLowerCase() == "image")
                    imgAlt = true;
                else
                    ssrch = i.src.search(/pbs\.twimg\.com\/media\//i);

                
                if (imgAlt || ssrch >= 0)
                {
                    mediaImages.push(i.src);
                }
            }

            // Images end up in the DOM as 1, 3, 2, 4 when there are 4
            // Fix the ordering
            if (mediaImages.length == 4) // max image count in a tweet
            { 
                let tmp = mediaImages[1];
                mediaImages[1] = mediaImages[2];
                mediaImages[2] = tmp;
            }
        }

        return mediaImages;
    }

    function addCopyButtonNu(tweet) {
        let imgs = getImagesNu(tweet);
        if (imgs.length < 1) return;

        let actList = tweet.getElementsByClassName(TWEET_BUTTON_CLASS)[0],
            uname = "";
        
        if (!actList) {
            actList = tweet.getElementsByClassName(FOCUSED_TWEET_BUTTON_CLASS)[0];
            focusedTweet = true;
        }

        // Check for a previously added copy button and remove it
        let oldCBtn = actList.getElementsByClassName("copybtn");
        if (oldCBtn.length > 0) {
            let oldDiv = oldCBtn[0].parentElement;
            if (oldDiv.children.length > 1) oldDiv = oldDiv.parentElement;

            oldDiv.parentElement.removeChild(oldDiv);
        }

        if (!btnDivClassList || !imgLinkClassList) {
            // Match the class list of the rest of the tweet buttons
            btnDivClassList = actList.children[0].classList;
            // Match the class list of other inner div parts of the tweet buttons, mostly for text colour/styling
            imgLinkClassList = actList.children[0].children[0].children[0].classList;
        }

        // Search for user name in the most retarded way possible because it is not in a uniquely identifiable element in any way
        let spans = tweet.getElementsByTagName("span");
        for (let s of spans) {
            // Apparently if a nick has an icon/emoji in it, it will be split into multiple spans
            // So if a nick is set as <something><emoji>@<something else> it will find that first
            // Thankfully the nick spans are within another span, where the user name span is inside a div
            if (s.parentElement.tagName != "DIV") continue; 
            
            if (s.innerText.search(/^@\S+$/) == 0) { // we check from the start so if a match is found it will always be index 0
                uname = s.innerText.substring(1);
                break;
            }
        }

        let cBtn = createCopyButtonNu(imgs, uname);

        if (focusedTweet)
            actList.appendChild(cBtn);
        else
            actList.insertBefore(cBtn, actList.children[actList.childElementCount - 1]);
        

        // No idea if classes differ between most tweets and a focusedd tweet, or how much it matters
        // Just reset the class lists to be safe after having them set for the one tweet
        if (focusedTweet) {
            btnDivClassList = null;
            imgLinkClassList = null;
            focusedTweet = false;
        }
    }

    function createCopyButtonNu(images, uname)
    {
        let btnDiv = document.createElement("div");
        btnDiv.classList = btnDivClassList;
        btnDiv.classList.add("copyroot");
        
        if (images.length > 1)
        {
            let btn = document.createElement("a"), // "button", right
                imlDiv = document.createElement("div"),
                wrapDiv = document.createElement("div");
            
            btn.classList = imgLinkClassList;
            btn.classList.add("copybtn");
            btn.innerText = "Images";
            btn.href = "#";
            btn.addEventListener("click", function(e){
                e.preventDefault();
                
                let imgList = e.target.nextElementSibling;
                if (!imgList.style.visibility)
                {
                    imgList.style.visibility = "visible";
                    if (COPY_ALL) multiImageCopy(e.target);
                }
                else
                {
                    imgList.style.visibility = "";
                }
                
                if (imgList.id != "imgList")
                {
                    let il = document.getElementById("imgList");
                    if (il)
                    {
                        il.id = "";
                        il.style.visibility = "";
                    }
                    
                    imgList.id = "imgList";
                }
            });
            
            imlDiv.classList.add("imgList");
            wrapDiv.classList = imgLinkClassList;
            
            for (let i = 0; i < images.length; i++)
            {
                let format = images[i].match(/format=([^&]+)/)[1];
                let link = images[i].replace(/\?.*$/, "." + format + "?name=orig");

                if (uname)
                    link = link + "#@" + uname;
                
                let a = createBtnForLinkNu(link, i+1);
                imlDiv.appendChild(a);
            }

            wrapDiv.appendChild(btn);
            wrapDiv.appendChild(imlDiv);
            btnDiv.appendChild(wrapDiv);
        }
        else
        {
            let format = images[0].match(/format=([^&]+)/)[1];
            let link = images[0].replace(/\?.*$/, "." + format + "?name=orig");

            if (uname)
                link = link + "#@" + uname;

            let btn = createBtnForLinkNu(link, 0);
            btnDiv.appendChild(btn);
        }
        
        return btnDiv;
    }

    function createBtnForLinkNu(link, num)
    {
        let btn = document.createElement("a"); // "button", right
        btn.href = link;
        btn.addEventListener("click", imgLinkClick);
        
        if (num == 0)
        {
            btn.classList = imgLinkClassList;
            btn.innerText = "Copy";
        }
        else
        {
            btn.innerText = "Copy " + (num);
            btn.classList.add("imgLnk");
        }
        btn.classList.add("copybtn");
        
        return btn;
    }

    /****************************
     * END RETARDED-TWITTER
     ****************************/
    
    init();
})();
