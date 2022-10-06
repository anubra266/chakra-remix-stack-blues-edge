import qs from "qs";

export const inputFromSearch = (queryString: URLSearchParams) =>
  qs.parse(queryString.toString());

export const inputFromFormData = (formData: FormData) =>
  inputFromSearch(new URLSearchParams(formData as URLSearchParams));

export const inputFromForm = async (request: Request) =>
  inputFromFormData(await request.clone().formData());

export const inputFromUrl = (request: Request) =>
  inputFromSearch(new URL(request.url).searchParams);
