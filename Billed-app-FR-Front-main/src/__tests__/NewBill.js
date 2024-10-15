/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes.js";
import BillsUI from "../views/BillsUI.js";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
    describe("When I am on NewBill Page", () => {
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

        test("Then mail icon on verticallayout should be highlighted", async () => {
            window.onNavigate(ROUTES_PATH.NewBill);
            await waitFor(() => screen.getByTestId("icon-mail"));
            const windowIcon = screen.getByTestId("icon-mail");
            expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
        });

        test("Then the file upload should only accept jpg, jpeg, and png formats", () => {
            const onNavigate = jest.fn();
            const newBill = new NewBill({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });
            const file = screen.getByTestId("file");
            const handleChangeFile = jest.fn(newBill.handleChangeFile);
            file.addEventListener("change", handleChangeFile);

            // Test with a valid file (jpg)
            fireEvent.change(file, {
                target: {
                    files: [
                        new File(["file contents"], "document.jpg", {
                            type: "image/jpeg",
                        }),
                    ],
                },
            });
            expect(handleChangeFile).toHaveBeenCalled();
            expect(file.files[0].name).toBe("document.jpg");

            // Test with an invalid file (pdf)
            const alertMock = jest
                .spyOn(window, "alert")
                .mockImplementation(() => { });
            fireEvent.change(file, {
                target: {
                    files: [
                        new File(["file contents"], "document.pdf", {
                            type: "application/pdf",
                        }),
                    ],
                },
            });
            expect(alertMock).toHaveBeenCalledWith(
                "Please upload a file in jpg, jpeg, or png format."
            );
            expect(file.value).toBe("");

            // Clean up mock
            alertMock.mockRestore();
        });

        describe("When a new bill get submited", () => {
            test("Then the form should be submitted with correct data", async () => {
                const onNavigate = jest.fn();
                const newBill = new NewBill({
                    document,
                    onNavigate,
                    store: mockStore,
                    localStorage: window.localStorage,
                });
                const form = screen.getByTestId("form-new-bill");
                const inputExpenseName = screen.getByTestId("expense-name");
                const inputAmount = screen.getByTestId("amount");
                const inputDate = screen.getByTestId("datepicker");

                fireEvent.change(inputExpenseName, {
                    target: { value: "Test Expense" },
                });
                fireEvent.change(inputAmount, { target: { value: "100" } });
                fireEvent.change(inputDate, {
                    target: { value: "2023-04-15" },
                });

                const handleSubmit = jest.spyOn(newBill, "handleSubmit");
                form.addEventListener("submit", handleSubmit);
                fireEvent.submit(form);

                expect(handleSubmit).toHaveBeenCalled();
                expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
            });
        });
    });
});
