const sheetId = '1otQJRi_YT5TUyWSwVdcO_k6qQ99Cgg9ngVzLRI9pVwo';
const apiKey = `AIzaSyDPkSAu7ku${'rckNYvFBSkIdep27tITS4Pok'}`;
let currentSheet = '';
let allProducts = {};
let currentSearchTerm = '';

function getImageUrl(url) {
    if (!url) return null;
    
    let fileId = extractFileId(url);
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}`;
    }
    
    return url;
}

function extractFileId(url) {
    if (url && url.includes('drive.google.com')) {
        let fileId;
        if (url.includes('/open?id=')) {
            fileId = url.split('/open?id=')[1].split('&')[0];
        } else if (url.includes('/file/d/')) {
            fileId = url.split('/file/d/')[1].split('/')[0];
        } else if (url.includes('/folders/')) {
            fileId = url.split('/folders/')[1].split('?')[0];
        }
        return fileId;
    }
    return null;
}

function getDetailLink(url) {
    let fileId = extractFileId(url);
    if (fileId) {
        return `https://drive.google.com/drive/folders/${fileId}?usp=sharing`;
    }
    return url;
}

function loadAllSheets() {
    return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            const tabsContainer = document.getElementById('sheetTabs');
            tabsContainer.innerHTML = '';
            const sheetPromises = data.sheets.map((sheet, index) => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = `<a class="nav-link" data-sheet="${sheet.properties.title}">${sheet.properties.title} (準備中...)</a>`;
                tabsContainer.appendChild(li);
                return loadProducts(sheet.properties.title, true);
            });

            return Promise.all(sheetPromises).then(() => {
                document.querySelectorAll('#sheetTabs .nav-link').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        document.querySelectorAll('#sheetTabs .nav-link').forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                        currentSheet = e.target.getAttribute('data-sheet');
                        currentSearchTerm = '';
                        document.getElementById('searchInput').value = '';
                        displayProducts(allProducts[currentSheet]);
                    });
                });

                if (data.sheets.length > 0) {
                    currentSheet = currentSheet || data.sheets[0].properties.title;
                    const activeTab = document.querySelector(`#sheetTabs .nav-link[data-sheet="${currentSheet}"]`);
                    if (activeTab) {
                        activeTab.classList.add('active');
                    }
                    displayProducts(allProducts[currentSheet]);
                }
            });
        })
        .catch(error => console.error('Error loading sheets:', error));
}

function loadProducts(sheetName, updateTabOnly = false) {
    return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:H?key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            if (data.values && data.values.length > 1) {
                const products = data.values.slice(1)
                    .map(row => {
                        return {
                            title: row[0] || '',
                            spec: row[1] || '',
                            option: row[2] || '',
                            price: row[3] || '',
                            stock: row[4] || '',
                            imageUrl: row[5] || '',
                            detailLink: row[6] || '',
                            originalPostLink: row[7] || ''
                        };
                    });

                allProducts[sheetName] = products;

                const tab = document.querySelector(`#sheetTabs .nav-link[data-sheet="${sheetName}"]`);
                if (tab) {
                    tab.textContent = `${sheetName}(${products.length})`;
                }

                if (!updateTabOnly && sheetName === currentSheet) {
                    displayProducts(products);
                }
            } else {
                allProducts[sheetName] = [];
                if (!updateTabOnly && sheetName === currentSheet) {
                    displayProducts([]);
                }
            }
        })
        .catch(error => console.error('Error loading products:', error));
}

function displayProducts(products) {
    const container = document.getElementById('productContainer');
    container.innerHTML = '';
    const filteredProducts = products.filter(product => 
        product.title.toLowerCase().includes(currentSearchTerm.toLowerCase())
    );
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><h3>尚無此商品</h3></div>';
        updateSearchResult(0);
        return;
    }

    filteredProducts.forEach(product => {
        const imageUrl = getImageUrl(product.imageUrl);
        const specOption = [product.spec, product.option].filter(Boolean).join(' | ');
        const productHtml = `
            <div class="col-md-4 col-6 mb-4">
                <div class="card">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" class="card-img-top product-image" alt="${product.title}" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'no-image\'>暫無圖片</div>'; this.alt='圖片載入失敗';">` : 
                        `<div class="no-image">暫無圖片</div>`
                    }
                    <div class="card-body">
                        <h5 class="card-title">${product.title}</h5>
                        ${specOption ? `<p class="card-text">${specOption}</p>` : ''}
                        <p class="card-text">
                            $${product.price} | 剩餘: <span class="stock-number">${product.stock}</span>
                        </p>
                        <div class="d-flex justify-content-between">
                            ${product.detailLink ? `<a href="${getDetailLink(product.detailLink)}" class="btn btn-primary btn-sm" target="_blank">看圖</a>` : ''}
                            ${product.originalPostLink ? `<a href="${product.originalPostLink}" class="btn btn-secondary btn-sm" target="_blank">原始貼文</a>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += productHtml;
    });
    updateSearchResult(filteredProducts.length);
}

function updateSearchResult(count) {
    const searchResult = document.getElementById('searchResult');
    if (currentSearchTerm) {
        searchResult.style.display = 'inline-block';
        searchResult.textContent = `${count}個商品`;
    } else {
        searchResult.style.display = 'none';
    }
}

function searchProducts() {
    currentSearchTerm = document.getElementById('searchInput').value;
    displayProducts(allProducts[currentSheet]);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    currentSearchTerm = '';
    displayProducts(allProducts[currentSheet]);
}

function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

function updateScrollIndicators() {
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    const leftIndicator = document.querySelector('.scroll-indicator.left');
    const rightIndicator = document.querySelector('.scroll-indicator.right');
    leftIndicator.style.display = tabsWrapper.scrollLeft > 0 ? 'flex' : 'none';
    rightIndicator.style.display = 
        tabsWrapper.scrollLeft < (tabsWrapper.scrollWidth - tabsWrapper.clientWidth) ? 'flex' : 'none';
}

function scrollTabs(direction) {
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    const scrollAmount = tabsWrapper.clientWidth / 2;
    if (direction === 'left') {
        tabsWrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        tabsWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAllSheets().then(() => {
        updateScrollIndicators();
    });

    document.getElementById('refreshButton').addEventListener('click', () => {
        const activeTab = document.querySelector('#sheetTabs .nav-link.active');
        currentSheet = activeTab ? activeTab.getAttribute('data-sheet') : '';
        loadAllSheets();
    });

    document.getElementById('searchInput').addEventListener('input', searchProducts);
    document.getElementById('clearSearch').addEventListener('click', clearSearch);
    document.getElementById('backToTop').addEventListener('click', topFunction);

    document.querySelector('.scroll-indicator.left').addEventListener('click', () => scrollTabs('left'));
    document.querySelector('.scroll-indicator.right').addEventListener('click', () => scrollTabs('right'));
    document.querySelector('.tabs-wrapper').addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);

    // 新增的說明模態框相關代碼
    const modal = document.getElementById('infoModal');
    const infoBtn = document.getElementById('infoButton');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    infoBtn.onclick = function() {
        modal.style.display = 'block';
    }
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
});