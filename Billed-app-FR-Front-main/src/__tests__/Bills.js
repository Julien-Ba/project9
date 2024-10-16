/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import Bills from "../containers/Bills.js";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bills should be ordered from latest to earliest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then there is a new bill button", () => {
      document.body.innerHTML = BillsUI({ data: [] });
      expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
    });

    beforeEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.tld",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
    });

    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getAllByTestId("icon-window"));
      const windowIcon = screen.getAllByTestId("icon-window")[0];
      expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
    });

    test("Then if there is a bill, an icon-eye is visible to open it", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      expect(screen.getAllByTestId("icon-eye")[0]).toBeTruthy();
    });

    test("Then the new bill button is clickable and link to the new bill page", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("btn-new-bill"));
      const billsContainer = new Bills({
        document,
        onNavigate: window.onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const handleClickNewBill = jest.fn(
        billsContainer.handleClickNewBill
      );
      const buttonNewBill = screen.getByTestId("btn-new-bill");
      buttonNewBill.addEventListener("click", handleClickNewBill);
      fireEvent.click(buttonNewBill);
      expect(handleClickNewBill).toHaveBeenCalled();
      await waitFor(() => {
        expect(
          screen.getByText("Envoyer une note de frais")
        ).toBeTruthy();
      });
    });

    test("Then handleClickNewBill should navigate to NewBill page path", () => {
      const onNavigateMock = jest.fn();
      const billsInstance = new Bills({
        document,
        onNavigate: onNavigateMock,
        store: null,
        localStorage: null,
      });
      billsInstance.handleClickNewBill();
      expect(onNavigateMock).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });

    test("Then the icon-eye should be clickable and open the modale", async () => {
      mockStore.bills = jest.fn().mockReturnValue({
        list: jest.fn().mockResolvedValue(bills),
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getAllByTestId("icon-eye")[0]);
      const bill = new Bills({
        document,
        onNavigate: window.onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      $.fn.modal = jest.fn();
      const eye = screen.getAllByTestId("icon-eye")[0];
      const handleClickIconEye = jest.fn(bill.handleClickIconEye(eye));
      eye.addEventListener("click", handleClickIconEye);
      fireEvent.click(eye);
      expect(handleClickIconEye).toHaveBeenCalled();
      const modale = document.getElementById("modaleFile");
      expect(modale).toBeTruthy();
    });

    test("Then handleClickIconEye should open modal with correct image", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: null,
      });

      $.fn.modal = jest.fn();
      const eye = screen.getAllByTestId("icon-eye")[0];
      const mockBillUrl = "https://example.com/bill.jpg";
      eye.setAttribute("data-bill-url", mockBillUrl);

      billsInstance.handleClickIconEye(eye);

      const modale = document.getElementById("modaleFile");
      const modalImage = modale.querySelector("img");
      expect(modalImage.src).toBe(mockBillUrl);
      expect($.fn.modal).toHaveBeenCalled();
    });

    test("Then getBills should fetch bills from API", async () => {
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const bills = await billsInstance.getBills();
      expect(mockStore.bills).toHaveBeenCalled();
      expect(bills.length).toBe(4); // Assuming the mockStore returns 4 bills
    });

    test("Then getBills should handle API errors", async () => {
      const errorMessage = "Error fetching bills";
      const errorMock = {
        list: jest.fn().mockRejectedValue(new Error(errorMessage)),
      };
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: { bills: () => errorMock },
        localStorage: window.localStorage,
      });

      let error;
      try {
        await billsInstance.getBills();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.message).toBe(errorMessage);
      expect(errorMock.list).toHaveBeenCalled();
    });

    test("Then getBills should handle formatting errors", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });
      const errorDoc = { date: "invalid-date", status: "pending" };
      const errorMock = {
        list: jest.fn().mockResolvedValue([errorDoc]),
      };
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: { bills: () => errorMock },
        localStorage: window.localStorage,
      });
      const result = await billsInstance.getBills();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(Error),
        "for",
        errorDoc
      );
      expect(result).toEqual([
        {
          ...errorDoc,
          date: "invalid-date",
          status: expect.any(String),
        },
      ]);

      consoleSpy.mockRestore();
    });

    describe("When an error occurs on API", () => {
      const errorCodes = [404, 500];

      errorCodes.forEach((errorCode) => {
        test(`Then fails with ${errorCode} message error`, async () => {
          jest.spyOn(mockStore, "bills");
          mockStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(
                  new Error(`Erreur ${errorCode}`)
                );
              },
            };
          });
          document.body.innerHTML = BillsUI({
            error: `Erreur ${errorCode}`,
          });
          const message = screen.getByText(`Erreur ${errorCode}`);
          expect(message).toBeTruthy();
        });
      });
    });
  });
});
