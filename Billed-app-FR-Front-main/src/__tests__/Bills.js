/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import Bills from "../containers/Bills.js";
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {

    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)

      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBeTruthy()
    })

    test("Then bills should be ordered from latest to earliest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then there is a new bill button", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
    })

    test("Then the new bill button is clickable and link to the new bill page", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      mockStore.bills = jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue(bills)
      })
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('btn-new-bill'))
      const billsContainer = new Bills({
        document, onNavigate: window.onNavigate, store: mockStore, localStorage: window.localStorage
      })
      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill)
      const buttonNewBill = screen.getByTestId('btn-new-bill')
      buttonNewBill.addEventListener('click', handleClickNewBill)
      fireEvent.click(buttonNewBill)
      expect(handleClickNewBill).toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
      })
    })

    test("Then if there is a bill, an icon-eye is visible to open it", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      expect(screen.getAllByTestId("icon-eye")[0]).toBeTruthy();
    })

    test("Then the icon-eye should be clickable and open the modale", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      mockStore.bills = jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue(bills)
      })
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getAllByTestId("icon-eye")[0])
      const bill = new Bills({
        document, onNavigate: window.onNavigate, store: mockStore, localStorage: window.localStorage
      })
      $.fn.modal = jest.fn();
      const eye = screen.getAllByTestId("icon-eye")[0]
      const handleClickIconEye = jest.fn(bill.handleClickIconEye(eye))
      eye.addEventListener('click', handleClickIconEye)
      fireEvent.click(eye)
      expect(handleClickIconEye).toHaveBeenCalled()
      const modale = document.getElementById('modaleFile')
      expect(modale).toBeTruthy();
    })

  })
})
