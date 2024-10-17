/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";



describe("Given I am connected as an employee", () => {
    describe("When I am on NewBill Page", () => {

        const createNewBill = (customStore = mockStore) => {
            return new NewBill({
                document,
                onNavigate: jest.fn(),
                store: customStore,
                localStorage: window.localStorage,
            });
        };

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
            window.onNavigate(ROUTES_PATH.NewBill);
        });

        afterEach(() => {
            document.body.innerHTML = "";
            jest.clearAllMocks();
        });

        test("Then mail icon on vertical layout should be highlighted", async () => {
            await waitFor(() => screen.getByTestId("icon-mail"));
            const mailIcon = screen.getByTestId("icon-mail");
            expect(mailIcon.classList.contains("active-icon")).toBeTruthy();
        });

        test("Then the NewBill form should be rendered correctly", () => {
            const form = screen.getByTestId("form-new-bill");
            const fields = [
                "expense-type",
                "expense-name",
                "datepicker",
                "amount",
                "vat",
                "pct",
                "commentary",
                "file"
            ];
            expect(form).toBeTruthy();
            fields.forEach((fieldId) => {
                expect(screen.getByTestId(fieldId)).toBeTruthy();
            });
        });

        describe("When I select a file to upload", () => {
            let newBill, file, handleChangeFile;

            beforeEach(() => {
                newBill = createNewBill();
                file = screen.getByTestId("file");
                handleChangeFile = jest.fn(newBill.handleChangeFile);
                file.addEventListener("change", handleChangeFile);
            });

            test("Then it accepts regular image format", () => {
                fireEvent.change(file, {
                    target: {
                        files: [new File(["file contents"], "document.jpg", { type: "image/jpeg" })]
                    }
                });
                expect(handleChangeFile).toHaveBeenCalled();
                expect(file.files[0].name).toBe("document.jpg");
            });

            test("Then it rejects non-image formats", () => {
                const alertMock = jest.spyOn(window, "alert").mockImplementation(() => { });
                fireEvent.change(file, {
                    target: {
                        files: [new File(["file contents"], "document.pdf", { type: "application/pdf" })]
                    }
                });
                expect(alertMock).toHaveBeenCalledWith(
                    "Please upload a file in jpg, jpeg, or png format."
                );
                expect(file.value).toBe("");
            });
        });

        describe("When a new bill is submitted", () => {

            test("Then the submit function get called", () => {
                const newBill = createNewBill();
                const form = screen.getByTestId("form-new-bill");
                const handleSubmit = jest.fn(newBill.handleSubmit);
                form.addEventListener("submit", handleSubmit);
                fireEvent.submit(form);
                expect(handleSubmit).toHaveBeenCalled();
            });

            test("Then it should create a new bill with correct data", async () => {
                document.body.innerHTML = NewBillUI();

                const createSpy = jest.fn().mockResolvedValue({
                    fileUrl: "http://localhost:3456/images/test.jpg",
                    key: "1234",
                });
                const updateSpy = jest.fn().mockResolvedValue({});

                const mockedStore = {
                    bills: jest.fn().mockReturnValue({
                        create: createSpy,
                        update: updateSpy,
                    }),
                };

                const newBill = createNewBill(mockedStore);

                fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } });
                fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Test expense" } });
                fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-04-15" } });
                fireEvent.change(screen.getByTestId("amount"), { target: { value: "100" } });
                fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
                fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });
                fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Test comment" } });

                const fileInput = screen.getByTestId("file");
                const file = new File(["file contents"], "document.jpg", { type: "image/jpeg" });
                Object.defineProperty(fileInput, "files", { value: [file] });

                await newBill.handleChangeFile({
                    preventDefault: jest.fn(),
                    target: {
                        value: "C:\\fakepath\\document.jpg",
                        files: [file],
                    },
                });

                await waitFor(() => expect(createSpy).toHaveBeenCalled());

                const form = screen.getByTestId("form-new-bill");
                fireEvent.submit(form);

                await waitFor(() => expect(updateSpy).toHaveBeenCalled());

                const updateCall = updateSpy.mock.calls[0][0]; // First call, first argument
                const billArgument = JSON.parse(updateCall.data);
                const email = JSON.parse(localStorage.getItem("user")).email;

                expect(billArgument).toEqual({
                    email,
                    type: "Transports",
                    name: "Test expense",
                    amount: 100,
                    date: "2023-04-15",
                    vat: "20",
                    pct: 20,
                    commentary: "Test comment",
                    fileUrl: "http://localhost:3456/images/test.jpg",
                    fileName: "document.jpg",
                    status: "pending",
                });

                expect(createSpy).toHaveBeenCalled();
                expect(updateSpy).toHaveBeenCalled();
            });

            describe("When bill creation fails", () => {
                test("Then an error should be logged", async () => {
                    document.body.innerHTML = NewBillUI();
                    const errorStore = {
                        bills: () => ({
                            create: jest.fn().mockRejectedValue(new Error("Erreur 500")),
                        }),
                    };
                    const newBill = createNewBill(errorStore);
                    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });

                    const file = screen.getByTestId("file");
                    Object.defineProperty(file, "files", {
                        value: [
                            new File(["test"], "test.jpg", {
                                type: "image/jpeg",
                            }),
                        ],
                    });

                    await newBill.handleChangeFile({
                        preventDefault: jest.fn(),
                        target: {
                            value: "C:\\fakepath\\test.jpg",
                            files: [file],
                        },
                    });

                    await new Promise((resolve) => setTimeout(resolve, 0));

                    expect(errorSpy).toHaveBeenCalled();
                    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
                    expect(errorSpy.mock.calls[0][0].message).toBe("Erreur 500");
                });
            });
        });
    });
});
