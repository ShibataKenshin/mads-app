/*=================================================================================================
// Project: CADS/MADS - An Integrated Web-based Visual Platform for Materials Informatics
//          Hokkaido University (2018)
//          Last Update: Q3 2023
// ________________________________________________________________________________________________
// Authors: Mikael Nicander Kuwahara (Lead Developer) [2021-]
// ________________________________________________________________________________________________
// Description: This is the Settings Configuration Form for the 'Custom' View, driven by ReduxForm
// ------------------------------------------------------------------------------------------------
// Notes: 'CustomForm' opens a customized form for the 'CustomVC' visualization component and allows
//        the user to edit its look, feel and behavior in multiple ways.
// ------------------------------------------------------------------------------------------------
// References: React, ReduxForm and semantic-view-ui libs, Needed FormField components, 3rd party
//             jquery & various color palettes, Internal Form Utilities Support functions
=================================================================================================*/

//*** TODO: This is yet not implemented into the application and is still under construction

//-------------------------------------------------------------------------------------------------
// Load required libraries
//-------------------------------------------------------------------------------------------------
import React, { useState } from 'react';
import { Field, reduxForm, Label } from 'redux-form';
import { Button, Form, Dropdown } from 'semantic-ui-react';

import MultiSelectDropdown from '../FormFields/MultiSelectDropdown';
import SemanticDropdown from '../FormFields/Dropdown';
import SemCheckbox from '../FormFields/Checkbox';
import Input from '../FormFields/Input';
import _ from 'lodash';

import * as allPal from "@bokeh/bokehjs/build/js/lib/api/palettes";
import { cmMax, colorMapOptions } from './FormUtils';

//-------------------------------------------------------------------------------------------------


//-------------------------------------------------------------------------------------------------
// Form Support Methods and Variables that manages various individual form fields that requires
// some form of attention to its content
//-------------------------------------------------------------------------------------------------

//=======================
const getDropdownOptions = (list) => list.map((i) => ({ key: i, text: i, value: i }));
//=======================

//=======================
const setSubmitButtonDisable = (disableState) => {
  if (disableState) { $(".ui.positive.button").prop('disabled', true); }
  else{ $(".ui.positive.button").prop('disabled', false); }
}
//=======================

const errors = {};
const errorValidate = (value, values, props, fieldName) => {
  const loadData = props.dataset
  const dataColumns = loadData.main.schema.fields.map(a => a.name);
  if (values.featureColumns){
    const valueInclude = values.featureColumns.map(v => dataColumns.includes(v));
    if(valueInclude.includes(false)){
      values.featureColumns = [];
      values.rootCatalyst = undefined;
      values.visualizationMethod = undefined;
    }
  }

  let error = undefined;

  // at least three columns are selected
  if(fieldName === "featureColumns"){
    if(value && value.length < 3){
      error = 'At least three(3) columns have to be selected';
    }
  }


  //Is required
  if (values && (fieldName == "rootCatalyst") || (fieldName == "featureColumns") || (fieldName == "visualizationMethod")){
    if(!value || _.isEmpty(value)){
      error = 'Required';
  }
    else { errors[fieldName] = false; }
  }


  errors[fieldName] = (error != undefined);

  if(values){
    if(!values.preprocessingEnabled){
      values.preprocMethod = undefined
      setSubmitButtonDisable(error || (Object.values(errors)).includes(true));
    }else{
      setSubmitButtonDisable(!value || error || (Object.values(errors)).includes(true));

    }
  }

  return error;
}
//=======================

//=======================
const CatalystSemanticDropdown = ({
  input,
  type,
  label,
  placeholder,
  renderLabel,
  styleMaker = styleMaker || (() => { return {}; }),
  meta: { touched, error, warning },
  ...props
}) => {
  const [options, setOptions] = React.useState(props.options || []);

  const handleSearchChange = (e, { searchQuery }) => {
    const filteredOptions = props.options.filter(option =>
      option.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setOptions(filteredOptions);
  };

  return (
    <Form.Field>
      <label>{label}</label>
      <Dropdown
        style={styleMaker(input.value)}
        fluid
        selection
        search
        {...input}
        {...props}
        onBlur={() => input.onBlur()}
        value={input.value}
        onChange={(param, data) => input.onChange(data.value)}
        onSearchChange={handleSearchChange}
        options={options}
        placeholder={placeholder}
      />
      {warning && <div>{JSON.stringify(error)}</div>}
      <Form.Field>
        {touched && 
          ((error && <i style={{ color: '#9f3a38', fontWeight: 'bold' }}>{error}</i>) ||
          (warning && <i style={{ color: '#e07407', fontWeight: 'bold' }}>{warning}</i>))}
      </Form.Field>
    </Form.Field>
  );
};

function makeCatalystOptions(data, columnName) {
  var catalystOptions = [];
  if (data) {
    const cataList = data.map(a => a[columnName]);
    catalystOptions = getDropdownOptions(cataList);
  }
  return catalystOptions;
}

//=======================

//-------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------
// The ReduxForm Module for this specific view and Visualisation Component
//-------------------------------------------------------------------------------------------------

const CatalystGeneForm = (props) => {
  // parameters and such
  const {
    handleSubmit,
    initialValues,
    pristine,
    reset,
    submitting,
    columns,
    targetId,
    colorTags,
    dataset,

  } = props;

  const cTags = colorTags.map((c) => ({
    text: c.color,
    value: c.id,
    props: { style: '' },
  }));

  const methods = ['Manual', 'PCA'];
  const preprocMethods = [
    'StandardScaler', 
    'Normalizer', 
    'MaxAbsScaler', 
    'MinMaxScaler',
  ];

  const visualizationMethod = [
    'Hierarchical Clustering', 
    'Parallel-coordinate Catalyst gene introduction',
    'Heatmap', 
    'Table', 
  ];


  //input managers
  const [fieldsAreShowing, toggleVisibleFields] = useState(
    initialValues.method != methods[1]
  );

  const [colorDisabled, setColorDisabled] = useState(
    !initialValues.colorAssignmentEnabled
  );

  const [sizeDisabled, setSizeDisabled] = useState(
    !initialValues.sizeAssignmentEnabled
  );

  const [preprocDisabled, setPreprocDisabled] = useState(
    !initialValues.preprocessingEnabled
  );

  const [currentCMVal, setValue] = useState(
    initialValues.options.colorMap
  );
  
  const [scalingMethod, setScalingMethod] = useState();


  const onCMChange = (event) => {
    setValue(event);
  };

  // The form itself, as being displayed in the DOM
  return (
    <Form onSubmit={handleSubmit}>
      

      <Form.Field>
        <label>Feature columns</label>
        <Field
          name="featureColumns"
          component={MultiSelectDropdown}
          placeholder="Columns"
          options={columns}
          validate={[ errorValidate ]}
        />
      </Form.Field>

      <Form.Field>
        <label>Catalyst</label>
        <Field
          name="rootCatalyst"
          component={CatalystSemanticDropdown}
          placeholder="catalysts"
          options={makeCatalystOptions(dataset.main.data, 'Catalyst')}
          validate={[ errorValidate ]}
        />
      </Form.Field>

      <Form.Field>
        <label>Visualization </label>
        <Field
          name="visualizationMethod"
          component={SemanticDropdown}
          placeholder="Visualization method"
          options={getDropdownOptions(visualizationMethod)}
          validate={[ errorValidate ]}
        />
      </Form.Field>

      <Form.Field>
          <label>Apply Data Preprocessing:</label>
          <Field
            name="preprocessingEnabled"
            component={SemCheckbox}
            toggle
            onChange={(e, data) => {
              setPreprocDisabled(!data);
            }}
          />
        </Form.Field>

        {!preprocDisabled && <div>
          <Form.Field>
            <label>Preprocessing Method:</label>
            <Field
              name="preprocMethod"
              component={SemanticDropdown}
              placeholder="scalingMethod"
              options={getDropdownOptions(preprocMethods)}
              disabled={preprocDisabled}
              validate={[ errorValidate ]}
              onChange={(e, data)=> {
                setScalingMethod(data)
              }}
            />
          </Form.Field>
        </div>}

        {!preprocDisabled && scalingMethod === 'MinMaxScaler' && 
        <Form.Group widths="equal">
          <label>Scaling Parameters:</label>
          <Field
            fluid
            name="options.scaling.max"
            component={Input}
            type="number"
            placeholder="max"
            label="Max"
          />
          <Field
            fluid
            name="options.scaling.min"
            component={Input}
            placeholder="min"
            type="number"
            label="Min"
          />
        </Form.Group>
      }



     
      <hr />
      <Form.Group widths="equal">
        <label>Extent:</label>
        <Field
          fluid
          name="options.extent.width"
          component={Input}
          placeholder="Width"
        />
        <Field
          fluid
          name="options.extent.height"
          component={Input}
          placeholder="Height"
        />
      </Form.Group>

      {/* <input
        type="hidden"
        name="options.camera"
      /> */}

    </Form>
  );
};
//-------------------------------------------------------------------------------------------------


//-------------------------------------------------------------------------------------------------
// Exporting and sharing this ReduxForm Module
//-------------------------------------------------------------------------------------------------
export default reduxForm({
  form: 'CatalystGene',
})(CatalystGeneForm);
//-------------------------------------------------------------------------------------------------