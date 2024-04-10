import { generateQuery } from './query.js';

const selectors = {
  prevButton: '#prev-button',
  nextButton: '#next-button',
  mainCollectionGridWrapper: '.main-collection-grid-wrapper',
  jsFilterPriceInput: '.js-filter-price input',
  dataFilterType: 'input[data-filter-type]',
  jsPaginationControls: '.js-pagination-controls',
  jsDefaultPagination: '.js-default-pagination',
};

class filterComponent extends HTMLElement {
  constructor() {
    super();
    this.currentCursor;
    this.hasNextPage;
    this.hasPrevPage;
    this.prevCursors = [];
    this.prevButton = this.querySelector(selectors.prevButton);
    this.nextButton = this.querySelector(selectors.nextButton);
    this.mainCollectionGrid = this.querySelector(selectors.mainCollectionGridWrapper);
    this.filterOptionPrice = this.querySelectorAll(selectors.jsFilterPriceInput);
    this.filterOptionList = this.querySelectorAll(selectors.dataFilterType);
    this.filterOptionQuery = '';
    this.detailsElements =  this.querySelectorAll('details');
    this.parts = window.location.pathname.split('/').filter(part => part.length > 0);
    this.collectionHandle = this.parts.length > 0 ? this.parts.pop() : 'all';

    this.getSelectOption = this.getSelectOption.bind(this);
    this.getSelectOptionList = this.getSelectOptionList.bind(this);
    this.fetchFilteredProducts = this.fetchFilteredProducts.bind(this);
    this.updateProductList = this.updateProductList.bind(this);

    this.nextButton.addEventListener('click', () => this.goNext());
    this.prevButton.addEventListener('click', () => this.goPrev());

    this.filterOptionPrice.forEach(el => el.addEventListener("input", this.getSelectOption));
    this.filterOptionList.forEach(el => el.addEventListener("input", this.getSelectOptionList));

    this.detailsToggle = this.detailsToggle.bind(this);

    this.detailsElements.forEach(details => {
      details.addEventListener("toggle", (event) => this.detailsToggle(event.target));
    });
  }

  async fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice) {
    let query = generateQuery(this.collectionHandle, this.currentCursor, this.prevCursors, filterOptionListQuery, minPrice, maxPrice);

    const url = "/api/2021-01/graphql";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": "1048a410c509db2baeca0a95b487efb8",
      },
      body: query,
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      const pageInfo = data.data.collection.products.pageInfo;
      this.hasNextPage = pageInfo.hasNextPage;
      this.hasPrevPage = pageInfo.hasPreviousPage;
      this.currentCursor = pageInfo.endCursor ? pageInfo.endCursor : null;

      if (this.hasNextPage) {
        this.prevCursors.push(pageInfo.startCursor);
        this.prevCursors.push(this.currentCursor);
      }

      this.prevCursors = [...new Set(this.prevCursors)];

      this.prevButton.style.display = this.hasPrevPage ? 'block' : 'none';
      this.nextButton.style.display = this.hasNextPage ? 'block' : 'none';

      return data.data.collection.products.edges.map(edge => edge.node);
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  async updateProductList (filterOptionListQuery, minPrice, maxPrice) {
    try {
      const products = await this.fetchFilteredProducts (filterOptionListQuery, minPrice, maxPrice);
      let productListHandle = '';

      products.forEach(el => {
        productListHandle += `${el.handle}+`;
      });

      productListHandle = productListHandle.slice(0, -1);

      const response = await fetch(`/collections/${this.collectionHandle}/search?q=${productListHandle}&section_id=collection-grid`);
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');
      const sourceQty = html.querySelector(selectors.mainCollectionGridWrapper);

      this.mainCollectionGrid.innerHTML = sourceQty.innerHTML;
    } catch (error) {
      console.error('Error updating product list:', error);
    }
  }

  goNext () {
    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (this.hasNextPage) this.updateProductList(this.filterOptionQuery, minPrice, maxPrice);
  }

  goPrev () {
    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (this.hasPrevPage) {
      this.prevCursors.pop();
      this.currentCursor = this.prevCursors.length > 0 ? this.prevCursors[this.prevCursors.length - 2] : null;
      this.updateProductList (this.filterOptionQuery, minPrice, maxPrice);
    }
  }

  getSelectOption (e) {
    let paginationControls = document.querySelector(selectors.jsPaginationControls);
    let defaultPagination = document.querySelector(selectors.jsDefaultPagination);

    defaultPagination.classList.add('hide');
    paginationControls.classList.add('show');

    this.prevCursors = [];
    this.currentCursor = null;

    let minPrice = parseInt(this.filterOptionPrice[0].value).toFixed(2) || 0;
    let maxPrice = parseInt(this.filterOptionPrice[1].value).toFixed(2) || 1000;

    if (maxPrice - minPrice >= 250 && maxPrice <= this.filterOptionPrice[1].max) {
      if (e.target.className === "filter-price__min") {
        this.filterOptionPrice[0].value = minPrice;
      } else {
        this.filterOptionPrice[1].value = maxPrice;
      }
    }

   this.updateProductList (this.filterOptionQuery, minPrice,maxPrice);
  }

  getSelectOptionList (e) {
    let paginationControls = document.querySelector(selectors.jsPaginationControls);
    let defaultPagination = document.querySelector(selectors.jsDefaultPagination);
    let checkedValues = [];

    defaultPagination.classList.add('hide');
    paginationControls.classList.add('show');

    this.prevCursors = [];
    this.currentCursor = null;

    this.filterOptionList.forEach(function(input) {
      if (input.checked) {
        checkedValues.push(input);
      }
    });

    this.filterOptionQuery = '';

    if (checkedValues.length > 0) {
      checkedValues.forEach(option => {
        let filterListOptionLabel = option.getAttribute('data-filter-type');
        if (filterListOptionLabel === 'available' ) {
          this.filterOptionQuery += `{ ${filterListOptionLabel}: ${option.value} },`
        } else {
          this.filterOptionQuery += `{ ${filterListOptionLabel}: "${option.value}" },`
        }
      })
    }

    this.updateProductList (this.filterOptionQuery, this.filterOptionPrice[0].value, this.filterOptionPrice[1].value);
  }

  detailsToggle(openedDetails) {
    if (openedDetails.open) {
      this.detailsElements.forEach((details) => {
        if (details !== openedDetails && details.open) {
          details.open = false;
        }
      });
    }
  }
}

customElements.define('filter-component', filterComponent);
