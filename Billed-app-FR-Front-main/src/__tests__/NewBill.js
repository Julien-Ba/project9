/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the file upload should only accept jpg, jpeg and png formats", () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
        email: "employee@test.com"
      }))

      document.body.innerHTML = NewBillUI()

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      })

      const file = screen.getByTestId("file")
      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      file.addEventListener("change", handleChangeFile)

      // Test with a valid file (jpg)
      fireEvent.change(file, {
        target: {
          files: [new File(['file contents'], 'document.jpg', { type: 'image/jpeg' })]
        }
      })
      expect(handleChangeFile).toHaveBeenCalled()
      expect(file.files[0].name).toBe("document.jpg")

      // Test with an invalid file (pdf)
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => { })
      fireEvent.change(file, {
        target: {
          files: [new File(['file contents'], 'document.pdf', { type: 'application/pdf' })]
        }
      })
      expect(alertMock).toHaveBeenCalledWith("Please upload a file in jpg, jpeg, or png format.")
      expect(file.value).toBe("")
    })
  })
})