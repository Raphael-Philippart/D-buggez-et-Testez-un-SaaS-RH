import { ROUTES_PATH } from '../constants/routes.js'
import Logout from "./Logout.js"

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document
    this.onNavigate = onNavigate
    this.store = store
    const formNewBill = this.document.querySelector(`form[data-testid="form-new-bill"]`)
    formNewBill.addEventListener("submit", this.handleSubmit)
    const file = this.document.querySelector(`input[data-testid="file"]`)
    file.addEventListener("change", this.handleChangeFile)
    this.fileUrl = null
    this.fileName = null
    this.billId = null
    new Logout({ document, localStorage, onNavigate })
  }

  validateFile = file => {
    return new Promise((resolve, reject) => {
      const fileName = file.name
      const fileType = file.type

      // Check file extension
      const allowedExtensions = /(\.jpg|\.jpeg|\.png)$/i
      if (!allowedExtensions.exec(fileName)) {
        return reject('Invalid file type. Please select a .jpg, .jpeg, or .png file.')
      }

      // Check MIME type
      const allowedMimeTypes = ['image/jpeg', 'image/png']
      if (!allowedMimeTypes.includes(fileType)) {
        return reject('Invalid file type. Please select a valid image file.')
      }

      // Verify binary signature (magic number)
      const reader = new FileReader()
      reader.onloadend = () => {
        // Convert the result into a Uint8Array and extract the first 4 bytes
        const arr = (new Uint8Array(reader.result)).subarray(0, 4);

        // Initialize an empty string to hold the hexadecimal representation of the bytes
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          // Convert each byte to a hexadecimal string and append it to the header
          header += arr[i].toString(16);
        }

        // Define known magic numbers for file types
        const magicNumbers = {
          jpg: 'ffd8ffe0',
          jpeg: 'ffd8ffe0',
          png: '89504e47'
        };

        // Check if the header matches any known magic numbers
        const fileType = Object.keys(magicNumbers).find(type => header.startsWith(magicNumbers[type]));

        // If no match is found, reject the promise with an error message
        if (!fileType) {
          return reject('Invalid file type. Please select a .jpg, .jpeg, or .png file.');
        }

        // If a match is found, resolve the promise
        resolve();
      };
      reader.readAsArrayBuffer(file)
    })
  }

  handleChangeFile = e => {
    e.preventDefault()
    const file = this.document.querySelector(`input[data-testid="file"]`).files[0]

    this.validateFile(file)
      .then(() => {
        const filePath = e.target.value.split(/\\/g)
        const fileName = filePath[filePath.length - 1]
        const formData = new FormData()
        const email = JSON.parse(localStorage.getItem("user")).email
        formData.append('file', file)
        formData.append('email', email)

        this.store
          .bills()
          .create({
            data: formData,
            headers: {
              noContentType: true
            }
          })
          .then(({ fileUrl, key }) => {
            console.log(fileUrl)
            this.billId = key
            this.fileUrl = fileUrl
            this.fileName = fileName
          }).catch(error => console.error(error))
      })
      .catch(error => {
        alert(error)
        e.target.value = ''  // Clear the input
      })
  }

  handleSubmit = e => {
    e.preventDefault()
    console.log('e.target.querySelector(`input[data-testid="datepicker"]`).value', e.target.querySelector(`input[data-testid="datepicker"]`).value)
    const email = JSON.parse(localStorage.getItem("user")).email
    const bill = {
      email,
      type: e.target.querySelector(`select[data-testid="expense-type"]`).value,
      name: e.target.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(e.target.querySelector(`input[data-testid="amount"]`).value),
      date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
      vat: e.target.querySelector(`input[data-testid="vat"]`).value,
      pct: parseInt(e.target.querySelector(`input[data-testid="pct"]`).value) || 20,
      commentary: e.target.querySelector(`textarea[data-testid="commentary"]`).value,
      fileUrl: this.fileUrl,
      fileName: this.fileName,
      status: 'pending'
    }
    this.updateBill(bill)
    this.onNavigate(ROUTES_PATH['Bills'])
  }

  // not need to cover this function by tests
  updateBill = (bill) => {
    if (this.store) {
      this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: this.billId })
        .then(() => {
          this.onNavigate(ROUTES_PATH['Bills'])
        })
        .catch(error => console.error(error))
    }
  }
}
